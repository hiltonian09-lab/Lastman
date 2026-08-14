import { getGameById, type GameRules } from "@/lib/db/games";
import type { RoundRow } from "@/lib/db/rounds";
import { getAvailablePicks, type PickOption } from "@/lib/football/round-pool";
import { getLeagueTable } from "@/lib/db/league-table";
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

  // Only needed for "bottom_of_league" — fetched once per round, not per entry.
  let positionByTeamId: Map<string, number> | null = null;
  if (rules.missedPickPolicy === "bottom_of_league") {
    const leagueId: string | undefined = JSON.parse(game.league_ids)[0];
    const table = leagueId ? await getLeagueTable(leagueId, 0, env) : [];
    positionByTeamId = new Map(table.map((r) => [r.teamId, r.position]));
  }

  function pickFallback(options: PickOption[]): PickOption {
    if (rules.missedPickPolicy === "bottom_of_league" && positionByTeamId) {
      const sorted = [...options].sort((a, b) => {
        const posA = positionByTeamId!.get(a.teamId) ?? Infinity;
        const posB = positionByTeamId!.get(b.teamId) ?? Infinity;
        return posA !== posB ? posB - posA : a.teamName.localeCompare(b.teamName);
      });
      return sorted[0];
    }
    // lowest_alphabetical (or bottom_of_league with no standings data yet)
    return [...options].sort((a, b) => a.teamName.localeCompare(b.teamName))[0];
  }

  for (const entry of activeEntries) {
    const alreadyPicked = await hasPickForRound(env, entry.id, round.id);
    if (alreadyPicked) continue;

    if (rules.missedPickPolicy === "eliminate") {
      await applySetback(env, entry, round.id);
      continue;
    }

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

    const choice = pickFallback(options);
    await insertAutoAssignedPick(env, {
      roundId: round.id,
      gameEntryId: entry.id,
      fixtureId: choice.fixtureId,
      teamId: choice.teamId,
    });
  }
}
