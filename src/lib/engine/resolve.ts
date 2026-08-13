import type { RoundRow } from "@/lib/db/rounds";
import { getGameById } from "@/lib/db/games";
import { getTeamsByIds } from "@/lib/db/teams";
import { sendEmail } from "@/lib/email/resend";
import { eliminationEmail } from "@/lib/email/templates";
import { getAppUrl } from "@/lib/http/app-url";
import { recordRoundSnapshot } from "@/lib/db/stats";
import { pickOutcome } from "./pick-outcome";
import {
  getPicksWithFixturesForRound,
  setPickResult,
  applySetback,
  resolveRound as markRoundResolved,
  markWinners,
  getActiveEntries,
  getEntryUserContact,
} from "./queries";

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
  const game = await getGameById(round.game_id, env);
  const gameUrl = game ? `${getAppUrl(env)}/games/${game.slug}` : getAppUrl(env);

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
      if (!entry) continue;

      const eliminated = await applySetback(env, entry, round.id);
      if (eliminated && game) {
        const [contact, teamsById] = await Promise.all([
          getEntryUserContact(env, entry.id),
          getTeamsByIds([pick.team_id], env),
        ]);
        const teamName = teamsById.get(pick.team_id)?.name ?? "your pick";
        if (contact) {
          const { subject, html } = eliminationEmail({
            gameName: game.name,
            teamName,
            gameUrl,
          });
          await sendEmail({ to: contact.email, subject, html }, env);
        }
      }
    }
  }

  await markRoundResolved(env, round.id);
  await recordRoundSnapshot(round, env);

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
