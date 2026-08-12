import { getGameById, type GameRules } from "@/lib/db/games";
import type { RoundRow } from "@/lib/db/rounds";
import { getAvailablePicks } from "@/lib/football/round-pool";
import {
  lockRound,
  getActiveEntries,
  hasPickForRound,
  insertAutoAssignedPick,
  applySetback,
} from "./queries";

/**
 * Locks a round whose deadline has passed and applies each active player's
 * missed-pick policy (PLAN.md §2) for anyone who didn't pick in time.
 */
export async function lockRoundAndAutoAssign(env: Env, round: RoundRow): Promise<void> {
  await lockRound(env, round.id);

  const game = await getGameById(round.game_id, env);
  if (!game) return;

  const rules = JSON.parse(game.rules_json) as GameRules;
  const activeEntries = await getActiveEntries(env, round.game_id);

  for (const entry of activeEntries) {
    const alreadyPicked = await hasPickForRound(env, entry.id, round.id);
    if (alreadyPicked) continue;

    if (rules.missedPickPolicy === "eliminate") {
      await applySetback(env, entry, round.id);
      continue;
    }

    // lowest_alphabetical: auto-assign the first available team, sorted alphabetically
    const options = await getAvailablePicks(
      game,
      entry.id,
      env,
      round.id,
      new Date(round.deadline_at),
    );
    if (options.length === 0) {
      // Exhausted every team playing this gameweek — rare edge case, treat as a setback
      await applySetback(env, entry, round.id);
      continue;
    }

    const sorted = [...options].sort((a, b) => a.teamName.localeCompare(b.teamName));
    const choice = sorted[0];
    await insertAutoAssignedPick(env, {
      roundId: round.id,
      gameEntryId: entry.id,
      fixtureId: choice.fixtureId,
      teamId: choice.teamId,
    });
  }
}
