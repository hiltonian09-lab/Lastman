import { getEnv } from "@/lib/cloudflare";
import { getGameweekWindow } from "./gameweek";
import { getLeaguesByIds } from "@/lib/db/leagues";
import { getTeamsByIds } from "@/lib/db/teams";
import { getUsedTeamIds, type FixtureRow } from "@/lib/db/fixtures";
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
 * Reads this gameweek's fixtures for every league a game covers, straight
 * from D1 — no football-data.org call here. The only two places that ever
 * call the API are the cron's full-schedule and live-scores syncs
 * (src/lib/engine/fixture-sync.ts); request-context code (pick screens,
 * dashboards) only ever reads whatever the cron already synced, so page
 * traffic can never burst past the 10 req/min free-tier limit.
 */
export async function getGameweekFixtures(game: GameRow, env?: Env): Promise<FixtureRow[]> {
  const e = env ?? (await getEnv());
  const leagueIds: string[] = JSON.parse(game.league_ids);
  if (leagueIds.length === 0) return [];

  const window = getGameweekWindow();
  const placeholders = leagueIds.map(() => "?").join(",");

  const { results } = await e.DB.prepare(
    `SELECT * FROM fixtures
     WHERE league_id IN (${placeholders})
       AND datetime(kickoff_at) >= datetime(?) AND datetime(kickoff_at) <= datetime(?)
     ORDER BY kickoff_at`,
  )
    .bind(...leagueIds, window.from.toISOString(), window.to.toISOString())
    .all<FixtureRow>();

  return results;
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
  currentRoundId?: string,
): Promise<PickOption[]> {
  const [fixtures, usedTeamIds, leagues] = await Promise.all([
    getGameweekFixtures(game, env),
    getUsedTeamIds(gameEntryId, env, currentRoundId),
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
