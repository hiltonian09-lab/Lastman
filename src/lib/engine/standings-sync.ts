import { listLeagues } from "@/lib/db/leagues";
import { getTeamsByProviderIds } from "@/lib/db/teams";
import { recordTeamStandings } from "@/lib/db/standings";
import { recordSync } from "@/lib/db/sync-status";
import { getCompetition, getStandings } from "@/lib/football/football-data-client";

// How many completed seasons back to keep in team_standings — the free
// football-data.org tier doesn't guarantee it goes back this far for every
// competition, so each season is fetched independently and a miss on one
// (rate limit, tier restriction, no data) doesn't block the others.
const SEASONS_OF_HISTORY = 3;

async function syncLeagueStandings(
  env: Env,
  leagueId: string,
  providerId: string,
): Promise<number> {
  const competition = await getCompetition(providerId, env);
  const currentYear = new Date(competition.currentSeason.startDate).getUTCFullYear();

  let total = 0;
  for (let yearsBack = 1; yearsBack <= SEASONS_OF_HISTORY; yearsBack++) {
    const season = currentYear - yearsBack;
    try {
      const table = await getStandings(providerId, season, env);
      if (table.length === 0) continue;

      const providerIds = table.map((e) => String(e.team.id));
      const teamMap = await getTeamsByProviderIds(providerIds, env);

      const entries = table
        .map((e) => {
          const team = teamMap.get(String(e.team.id));
          if (!team) return null;
          return {
            teamId: team.id,
            position: e.position,
            points: e.points,
            played: e.playedGames,
            won: e.won,
            drawn: e.draw,
            lost: e.lost,
            goalsFor: e.goalsFor,
            goalsAgainst: e.goalsAgainst,
          };
        })
        .filter((e): e is NonNullable<typeof e> => e !== null);

      if (entries.length === 0) continue;

      await recordTeamStandings(env, leagueId, String(season), entries);
      total += entries.length;
    } catch (err) {
      console.error(`[standings-sync] ${providerId} season ${season} failed: ${err}`);
    }
  }
  return total;
}

export async function runPreviousSeasonStandingsSync(env: Env): Promise<number> {
  const leagues = await listLeagues(env);
  let total = 0;
  for (const league of leagues) {
    try {
      const recorded = await syncLeagueStandings(env, league.id, league.provider_id);
      total += recorded;
    } catch (err) {
      console.error(`[standings-sync] ${league.provider_id} failed: ${err}`);
    }
  }
  await recordSync(env, "previous_season_standings", total);
  return total;
}
