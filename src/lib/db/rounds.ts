import { getEnv } from "@/lib/cloudflare";
import { getGameweekFixtures } from "@/lib/football/round-pool";
import type { GameRow } from "./games";

export interface RoundRow {
  id: string;
  game_id: string;
  round_number: number;
  deadline_at: string;
  status: "upcoming" | "locked" | "resolved";
  reminder_sent_at?: string | null;
}

/**
 * Ensures a round exists for the game's current gameweek window. If the most
 * recent round hasn't resolved yet, it's still current — reuse it rather than
 * creating a duplicate. Deadline is the earliest kickoff among that
 * gameweek's fixtures across every league the game covers.
 */
export async function ensureCurrentRound(game: GameRow, env?: Env): Promise<RoundRow> {
  const e = env ?? (await getEnv());

  const existing = await e.DB.prepare(
    "SELECT * FROM rounds WHERE game_id = ? ORDER BY round_number DESC LIMIT 1",
  )
    .bind(game.id)
    .first<RoundRow>();

  if (existing && existing.status !== "resolved") {
    // Self-heal an upcoming round 1 that's still pointed at an empty
    // gameweek — e.g. it was created before the owner set a start date, or
    // before the season's fixtures existed in D1 yet. Nobody can have picked
    // from an empty pool, so it's safe to re-anchor rather than leaving
    // players stuck on a dead placeholder deadline forever.
    if (existing.round_number === 1 && existing.status === "upcoming") {
      const currentWindowFixtures = await getGameweekFixtures(
        game,
        e,
        new Date(existing.deadline_at),
      );
      if (currentWindowFixtures.length === 0) {
        const healAnchor =
          game.starts_at && new Date(game.starts_at) > new Date()
            ? new Date(game.starts_at)
            : new Date();
        const freshFixtures = await getGameweekFixtures(game, e, healAnchor);
        if (freshFixtures.length > 0) {
          const earliestKickoff = freshFixtures.map((f) => f.kickoff_at).sort()[0];
          await e.DB.prepare("UPDATE rounds SET deadline_at = ? WHERE id = ?")
            .bind(earliestKickoff, existing.id)
            .run();
          return { ...existing, deadline_at: earliestKickoff };
        }
      }
    }
    return existing;
  }

  // Round 1 anchors to the owner's chosen start date (if set and still
  // ahead) rather than "today" — otherwise a game targeting a league whose
  // season hasn't kicked off yet (e.g. created weeks before the Premier
  // League's opening weekend) would find zero fixtures in the nearest
  // Fri-Mon window and fall back to a meaningless +7-day placeholder
  // deadline. Later rounds always anchor to today since the season is
  // already underway by then.
  const anchor =
    !existing && game.starts_at && new Date(game.starts_at) > new Date()
      ? new Date(game.starts_at)
      : undefined;

  const fixtures = await getGameweekFixtures(game, e, anchor);
  const earliestKickoff = fixtures.length
    ? fixtures.map((f) => f.kickoff_at).sort()[0]
    : new Date(Date.now() + 7 * 86_400_000).toISOString();

  const roundNumber = existing ? existing.round_number + 1 : 1;
  const id = crypto.randomUUID();

  await e.DB.prepare(
    "INSERT INTO rounds (id, game_id, round_number, deadline_at) VALUES (?, ?, ?, ?)",
  )
    .bind(id, game.id, roundNumber, earliestKickoff)
    .run();

  return { id, game_id: game.id, round_number: roundNumber, deadline_at: earliestKickoff, status: "upcoming" };
}

export async function getRoundById(id: string, env?: Env): Promise<RoundRow | null> {
  const e = env ?? (await getEnv());
  const row = await e.DB.prepare("SELECT * FROM rounds WHERE id = ?").bind(id).first<RoundRow>();
  return row ?? null;
}
