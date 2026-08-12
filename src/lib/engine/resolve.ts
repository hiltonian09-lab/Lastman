import type { RoundRow } from "@/lib/db/rounds";
import {
  getPicksWithFixturesForRound,
  setPickResult,
  applySetback,
  resolveRound as markRoundResolved,
  markWinners,
  getActiveEntries,
} from "./queries";

function pickOutcome(pick: {
  team_id: string;
  home_team_id: string;
  away_team_id: string;
  home_score: number | null;
  away_score: number | null;
}): "win" | "loss" | "draw" {
  const isHome = pick.team_id === pick.home_team_id;
  const own = isHome ? pick.home_score : pick.away_score;
  const opp = isHome ? pick.away_score : pick.home_score;
  if (own === null || opp === null) return "loss"; // shouldn't happen once fixture is finished
  if (own > opp) return "win";
  if (own === opp) return "draw";
  return "loss";
}

/**
 * Resolves a locked round once every fixture its picks reference has finished
 * (or been postponed/abandoned, which voids that pick — PLAN.md §2). Applies
 * lives/eliminations and checks for a winner or a split.
 */
export async function tryResolveRound(env: Env, round: RoundRow): Promise<void> {
  const picks = await getPicksWithFixturesForRound(env, round.id);
  if (picks.length === 0) return;

  const stillPending = picks.some(
    (p) => p.result === "pending" && ["scheduled", "live"].includes(p.fixture_status),
  );
  if (stillPending) return; // wait for the rest of the gameweek to finish

  const entriesBeforeResolution = await getActiveEntries(env, round.game_id);

  for (const pick of picks) {
    if (pick.result !== "pending") continue;

    if (pick.fixture_status === "postponed" || pick.fixture_status === "abandoned") {
      await setPickResult(env, pick.id, "void");
      continue;
    }

    const outcome = pickOutcome(pick);
    await setPickResult(env, pick.id, outcome);

    if (outcome !== "win") {
      const entry = entriesBeforeResolution.find((e) => e.id === pick.game_entry_id);
      if (entry) await applySetback(env, entry, round.id);
    }
  }

  await markRoundResolved(env, round.id);

  const stillActive = await getActiveEntries(env, round.game_id);
  if (stillActive.length === 1) {
    await markWinners(env, round.game_id, [stillActive[0].id]);
  } else if (stillActive.length === 0 && entriesBeforeResolution.length > 0) {
    // Everyone who was active going into this round got knocked out at once —
    // split the win per the game's default tiebreaker (PLAN.md §2).
    await markWinners(
      env,
      round.game_id,
      entriesBeforeResolution.map((e) => e.id),
    );
  }
}
