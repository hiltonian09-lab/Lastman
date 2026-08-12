import { getAllMatches, getMatchesInRange, type FdMatch } from "@/lib/football/football-data-client";
import { listLeagues, type LeagueRow } from "@/lib/db/leagues";
import { getTeamsByProviderIds } from "@/lib/db/teams";
import { upsertFixture, mapMatchStatus } from "@/lib/db/fixtures";
import { recordSync } from "@/lib/db/sync-status";

/**
 * These are the only two places that ever call football-data.org — both
 * cron-only, both bounded (one call per league, 6 leagues = 6 calls), so the
 * 10 req/min free-tier limit is never at risk regardless of how much page
 * traffic the app gets. Request-context code (pick screens, dashboards)
 * reads whatever's already in D1 and never calls the API itself.
 *
 * Each league's fetch is independent — if one hits a transient error (rate
 * limit, network blip), we skip it and keep going rather than aborting the
 * whole sync. The next tick (10 min later) naturally retries whatever
 * failed, since there's no per-league "already synced" flag blocking it.
 */

async function syncMatches(env: Env, leagueId: string, matches: FdMatch[]): Promise<number> {
  const providerTeamIds = Array.from(
    new Set(matches.flatMap((m) => [String(m.homeTeam.id), String(m.awayTeam.id)])),
  );
  const teamMap = await getTeamsByProviderIds(providerTeamIds, env);

  let synced = 0;
  for (const match of matches) {
    const home = teamMap.get(String(match.homeTeam.id));
    const away = teamMap.get(String(match.awayTeam.id));
    if (!home || !away) continue; // team not in our synced set (promoted/relegated team not yet re-synced)

    await upsertFixture(
      {
        externalId: String(match.id),
        leagueId,
        homeTeamId: home.id,
        awayTeamId: away.id,
        kickoffAt: match.utcDate,
        status: mapMatchStatus(match.status),
        homeScore: match.score.fullTime.home,
        awayScore: match.score.fullTime.away,
      },
      env,
    );
    synced++;
  }
  return synced;
}

async function syncLeague(
  env: Env,
  league: LeagueRow,
  fetchMatches: (competitionCode: string, env: Env) => Promise<FdMatch[]>,
): Promise<number> {
  try {
    const matches = await fetchMatches(league.provider_id, env);
    return await syncMatches(env, league.id, matches);
  } catch (err) {
    console.error(`[fixture-sync] ${league.provider_id} failed, skipping this tick: ${err}`);
    return 0;
  }
}

/** Whole season, every league — kickoff times, pairings. Cheap (6 calls), run every 3 days. */
export async function runFullScheduleSync(env: Env): Promise<number> {
  const leagues = await listLeagues(env);
  let total = 0;
  for (const league of leagues) {
    total += await syncLeague(env, league, getAllMatches);
  }
  await recordSync(env, "full_schedule", total);
  return total;
}

/** Narrow near-term window — catches finished results/postponements promptly. Run every cron tick. */
export async function runLiveScoresSync(env: Env): Promise<number> {
  const leagues = await listLeagues(env);
  const from = new Date(Date.now() - 1 * 86_400_000).toISOString().slice(0, 10);
  const to = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);

  let total = 0;
  for (const league of leagues) {
    total += await syncLeague(env, league, (code, e) => getMatchesInRange(code, from, to, e));
  }
  await recordSync(env, "live_scores", total);
  return total;
}
