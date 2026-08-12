import { getEnv } from "@/lib/cloudflare";
import { syncGameweekFixtures } from "@/lib/football/round-pool";
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
    return existing;
  }

  const fixtures = await syncGameweekFixtures(game, e);
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
