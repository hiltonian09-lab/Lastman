import { getRoundsPastDeadline, getLockedUnresolvedRounds, getRoundsNeedingReminder } from "./queries";
import { lockRoundAndAutoAssign } from "./round-lock";
import { chargeBalanceIfDue } from "./balance-charge";
import { tryResolveRound } from "./resolve";
import { sendRoundReminder } from "./round-reminder";
import { runFullScheduleSync, runLiveScoresSync } from "./fixture-sync";
import { isSyncDue } from "@/lib/db/sync-status";

const FULL_SCHEDULE_INTERVAL_HOURS = 72; // every 3 days

export interface TickResult {
  fullScheduleSynced: number | null;
  liveScoresSynced: number;
  remindersSent: number;
  roundsLocked: number;
  roundsResolved: number;
}

/**
 * The single cron entry point (see custom-worker.ts). Every fire:
 * 1. Refreshes near-term fixtures/scores from football-data.org (bounded —
 *    one call per league, ~6 calls total, well under the 10 req/min limit).
 * 2. Every 3 days, also re-pulls the full season schedule (another ~6 calls)
 *    to catch rescheduled kickoffs, newly confirmed TV picks, etc.
 * 3. Emails anyone who hasn't picked with <24h left on their round.
 * 4. Locks any round whose deadline has passed (missed-pick policy + the
 *    round-1 admin-fee balance charge).
 * 5. Resolves any locked round whose fixtures have all finished.
 *
 * Request-context code (pick screens, dashboards) never calls the API
 * itself — it only reads whatever this tick already synced into D1.
 */
export async function runTick(env: Env): Promise<TickResult> {
  const liveScoresSynced = await runLiveScoresSync(env);

  let fullScheduleSynced: number | null = null;
  if (await isSyncDue(env, "full_schedule", FULL_SCHEDULE_INTERVAL_HOURS)) {
    fullScheduleSynced = await runFullScheduleSync(env);
  }

  const reminderRounds = await getRoundsNeedingReminder(env);
  for (const round of reminderRounds) {
    await sendRoundReminder(env, round);
  }

  const dueRounds = await getRoundsPastDeadline(env);
  for (const round of dueRounds) {
    await lockRoundAndAutoAssign(env, round);
    if (round.round_number === 1) {
      await chargeBalanceIfDue(env, round.game_id);
    }
  }

  const lockedRounds = await getLockedUnresolvedRounds(env);
  for (const round of lockedRounds) {
    await tryResolveRound(env, round);
  }

  return {
    fullScheduleSynced,
    liveScoresSynced,
    remindersSent: reminderRounds.length,
    roundsLocked: dueRounds.length,
    roundsResolved: lockedRounds.length,
  };
}
