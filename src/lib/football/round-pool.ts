import { getMatchesInRange } from "./football-data-client";
import { getGameweekWindow, toDateOnly } from "./gameweek";
import { getLeaguesByIds } from "@/lib/db/leagues";
import { getTeamsByProviderIds, getTeamsByIds } from "@/lib/db/teams";
import { upsertFixture, mapMatchStatus, getUsedTeamIds, type FixtureRow } from "@/lib/db/fixtures";
import type { GameRow } from "@/lib/db/games";

export interface PickOption {
  fixtureId: string;
  teamId: string;
  teamName: string;
  opponentName: string;
  isHome: boolean;
  kickoffAt: string;
  leagueName: string;
}

/**
 * Pulls this gameweek's fixtures for every league a game covers, persists them
 * to D1 (so picks/rounds can reference stable fixture rows and results can be
 * resolved later), and returns the raw fixture rows.
 */
export async function syncGameweekFixtures(game: GameRow, env?: Env): Promise<FixtureRow[]> {
  const leagueIds: string[] = JSON.parse(game.league_ids);
  const leagues = await getLeaguesByIds(leagueIds, env);
  const window = getGameweekWindow();
  const from = toDateOnly(window.from);
  const to = toDateOnly(window.to);

  const fixtures: FixtureRow[] = [];

  for (const league of leagues) {
    const matches = await getMatchesInRange(league.provider_id, from, to, env);
    const providerTeamIds = Array.from(
      new Set(matches.flatMap((m) => [String(m.homeTeam.id), String(m.awayTeam.id)])),
    );
    const teamMap = await getTeamsByProviderIds(providerTeamIds, env);

    for (const match of matches) {
      const home = teamMap.get(String(match.homeTeam.id));
      const away = teamMap.get(String(match.awayTeam.id));
      if (!home || !away) continue; // team not in our synced set (shouldn't happen for supported leagues)

      const id = await upsertFixture(
        {
          externalId: String(match.id),
          leagueId: league.id,
          homeTeamId: home.id,
          awayTeamId: away.id,
          kickoffAt: match.utcDate,
          status: mapMatchStatus(match.status),
          homeScore: match.score.fullTime.home,
          awayScore: match.score.fullTime.away,
        },
        env,
      );

      fixtures.push({
        id,
        external_id: String(match.id),
        league_id: league.id,
        home_team_id: home.id,
        away_team_id: away.id,
        kickoff_at: match.utcDate,
        status: mapMatchStatus(match.status),
        home_score: match.score.fullTime.home,
        away_score: match.score.fullTime.away,
      });
    }
  }

  return fixtures;
}

/**
 * PLAN.md §2 round-validity rule: a team is available to a player if it has a
 * fixture this gameweek AND the player hasn't used it before — irrelevant
 * whether other, already-used teams are playing or not.
 */
export async function getAvailablePicks(
  game: GameRow,
  gameEntryId: string,
  env?: Env,
): Promise<PickOption[]> {
  const [fixtures, usedTeamIds, leagues] = await Promise.all([
    syncGameweekFixtures(game, env),
    getUsedTeamIds(gameEntryId, env),
    getLeaguesByIds(JSON.parse(game.league_ids), env),
  ]);

  const leagueNameById = new Map(leagues.map((l) => [l.id, l.name]));
  const teamIds = Array.from(
    new Set(fixtures.flatMap((f) => [f.home_team_id, f.away_team_id])),
  );
  const teamsById = await getTeamsByIds(teamIds, env);

  const options: PickOption[] = [];

  for (const fixture of fixtures) {
    const home = teamsById.get(fixture.home_team_id)?.name ?? "Unknown";
    const away = teamsById.get(fixture.away_team_id)?.name ?? "Unknown";

    if (!usedTeamIds.has(fixture.home_team_id)) {
      options.push({
        fixtureId: fixture.id,
        teamId: fixture.home_team_id,
        teamName: home,
        opponentName: away,
        isHome: true,
        kickoffAt: fixture.kickoff_at,
        leagueName: leagueNameById.get(fixture.league_id) ?? "",
      });
    }
    if (!usedTeamIds.has(fixture.away_team_id)) {
      options.push({
        fixtureId: fixture.id,
        teamId: fixture.away_team_id,
        teamName: away,
        opponentName: home,
        isHome: false,
        kickoffAt: fixture.kickoff_at,
        leagueName: leagueNameById.get(fixture.league_id) ?? "",
      });
    }
  }

  return options.sort((a, b) => a.kickoffAt.localeCompare(b.kickoffAt));
}
