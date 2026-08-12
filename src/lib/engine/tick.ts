import { getRoundsPastDeadline, getLockedUnresolvedRounds } from "./queries";
import { lockRoundAndAutoAssign } from "./round-lock";
import { chargeBalanceIfDue } from "./balance-charge";
import { tryResolveRound } from "./resolve";
import { getGameById } from "@/lib/db/games";
import { syncGameweekFixtures } from "@/lib/football/round-pool";

export interface TickResult {
  roundsLocked: number;
  roundsResolved: number;
}

/**
 * The single cron entry point (see custom-worker.ts). Runs on every Cron
 * Trigger fire: locks any round whose deadline has passed (applying missed-
 * pick policy + charging the round-1 admin-fee balance), then tries to
 * resolve any locked round whose fixtures have all finished.
 */
export async function runTick(env: Env): Promise<TickResult> {
  const dueRounds = await getRoundsPastDeadline(env);
  for (const round of dueRounds) {
    await lockRoundAndAutoAssign(env, round);
    if (round.round_number === 1) {
      await chargeBalanceIfDue(env, round.game_id);
    }
  }

  const lockedRounds = await getLockedUnresolvedRounds(env);
  const refreshedGames = new Set<string>();
  for (const round of lockedRounds) {
    // Refresh fixture statuses/scores from football-data.org before checking
    // whether the round can resolve — otherwise a quiet game (no page views)
    // would sit on stale "scheduled" fixtures forever.
    if (!refreshedGames.has(round.game_id)) {
      const game = await getGameById(round.game_id, env);
      if (game) await syncGameweekFixtures(game, env);
      refreshedGames.add(round.game_id);
    }
    await tryResolveRound(env, round);
  }

  return { roundsLocked: dueRounds.length, roundsResolved: lockedRounds.length };
}
