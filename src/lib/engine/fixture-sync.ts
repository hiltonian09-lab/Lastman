import { getAllMatches, getMatchesInRange, type FdMatch } from "@/lib/football/football-data-client";
import { listLeagues, getLeaguesDueForFullSync, markLeagueFullSynced, type LeagueRow } from "@/lib/db/leagues";
import { getTeamsByProviderIds } from "@/lib/db/teams";
import { buildUpsertFixtureStatement, runBatchedStatements, mapMatchStatus } from "@/lib/db/fixtures";
import { recordSync } from "@/lib/db/sync-status";

/**
 * These are the only two places that ever call football-data.org — both
 * cron-only, both bounded (one call per league at most, paced 6.5s apart —
 * see football-data-client.ts), so the 10 req/min free-tier limit is never
 * at risk regardless of how much page traffic the app gets. Request-context
 * code (pick screens, dashboards) reads whatever's already in D1 and never
 * calls the API itself.
 *
 * Each league's fetch is independent — if one hits a transient error (rate
 * limit, network blip), we skip it and keep going rather than aborting the
 * whole sync.
 *
 * Writes are batched (buildUpsertFixtureStatement + runBatchedStatements)
 * rather than one D1 round-trip per fixture — awaiting ~380 individual
 * upserts sequentially was slow enough that Cloudflare was cutting the cron
 * invocation off mid-run, which is why the full-schedule sync only ever
 * managed to finish 1-2 of 6 leagues in production. Full-schedule also only
 * processes a couple of leagues per tick (see FULL_SYNC_LEAGUES_PER_TICK)
 * and checkpoints each league's completion individually, so even if a tick
 * does get cut off, nothing already-synced gets redone — the next tick
 * picks up wherever it left off.
 */

const FULL_SYNC_LEAGUES_PER_TICK = 2;
const FULL_SYNC_INTERVAL_HOURS = 72; // every 3 days

async function syncMatches(env: Env, leagueId: string, matches: FdMatch[]): Promise<number> {
  const providerTeamIds = Array.from(
    new Set(matches.flatMap((m) => [String(m.homeTeam.id), String(m.awayTeam.id)])),
  );
  const teamMap = await getTeamsByProviderIds(providerTeamIds, env);

  const statements = [];
  for (const match of matches) {
    const home = teamMap.get(String(match.homeTeam.id));
    const away = teamMap.get(String(match.awayTeam.id));
    if (!home || !away) continue; // team not in our synced set (promoted/relegated team not yet re-synced)

    statements.push(
      buildUpsertFixtureStatement(env, {
        externalId: String(match.id),
        leagueId,
        homeTeamId: home.id,
        awayTeamId: away.id,
        kickoffAt: match.utcDate,
        status: mapMatchStatus(match.status),
        homeScore: match.score.fullTime.home,
        awayScore: match.score.fullTime.away,
      }),
    );
  }

  await runBatchedStatements(env, statements);
  return statements.length;
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

/**
 * Whole season, a couple of leagues per tick — kickoff times, pairings.
 * Each league is only re-synced every 3 days; spread across multiple ticks
 * on purpose so a single invocation never has to process all 6 at once.
 */
export async function runFullScheduleSync(env: Env): Promise<number> {
  const due = await getLeaguesDueForFullSync(env, FULL_SYNC_INTERVAL_HOURS, FULL_SYNC_LEAGUES_PER_TICK);
  let total = 0;
  for (const league of due) {
    const synced = await syncLeague(env, league, getAllMatches);
    total += synced;
    await markLeagueFullSynced(env, league.id);
  }
  if (due.length > 0) {
    await recordSync(env, "full_schedule", total);
  }
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
