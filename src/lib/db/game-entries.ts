import "server-only";
import { getEnv } from "@/lib/cloudflare";
import type { GameRow } from "./games";

export interface JoinResult {
  ok: boolean;
  error?: string;
}

async function countActiveEntries(gameId: string): Promise<number> {
  const env = await getEnv();
  const row = await env.DB.prepare(
    "SELECT COUNT(*) as count FROM game_entries WHERE game_id = ?",
  )
    .bind(gameId)
    .first<{ count: number }>();
  return row?.count ?? 0;
}

export async function joinGame(userId: string, game: GameRow): Promise<JoinResult> {
  const env = await getEnv();

  if (game.status === "blocked") {
    return { ok: false, error: "This game is temporarily unavailable." };
  }
  if (!["open", "in_progress"].includes(game.status)) {
    return { ok: false, error: "This game isn't open for joining." };
  }

  const existing = await env.DB.prepare(
    "SELECT id FROM game_entries WHERE game_id = ? AND user_id = ?",
  )
    .bind(game.id, userId)
    .first();
  if (existing) return { ok: true }; // already joined, treat as success

  if (game.max_players !== null) {
    const count = await countActiveEntries(game.id);
    if (count >= game.max_players) {
      return { ok: false, error: "This game is full." };
    }
  }

  const rules = JSON.parse(game.rules_json) as { lives: number };

  await env.DB.prepare(
    "INSERT INTO game_entries (id, game_id, user_id, lives_remaining) VALUES (?, ?, ?, ?)",
  )
    .bind(crypto.randomUUID(), game.id, userId, rules.lives ?? 0)
    .run();

  return { ok: true };
}

export async function isUserInGame(userId: string, gameId: string): Promise<boolean> {
  const env = await getEnv();
  const row = await env.DB.prepare(
    "SELECT id FROM game_entries WHERE game_id = ? AND user_id = ?",
  )
    .bind(gameId, userId)
    .first();
  return !!row;
}

export interface GameWithEntryCount extends GameRow {
  entry_id: string;
  entry_status: "active" | "eliminated" | "winner";
  entry_count: number;
}

export interface EntryWithUser {
  id: string;
  user_id: string;
  name: string;
  email: string;
  status: "active" | "eliminated" | "winner";
  lives_remaining: number;
  joined_at: string;
}

export async function listEntriesForGame(gameId: string): Promise<EntryWithUser[]> {
  const env = await getEnv();
  const { results } = await env.DB.prepare(
    `SELECT game_entries.id, game_entries.user_id, users.name, users.email,
            game_entries.status, game_entries.lives_remaining, game_entries.joined_at
     FROM game_entries
     JOIN users ON users.id = game_entries.user_id
     WHERE game_entries.game_id = ?
     ORDER BY game_entries.status ASC, users.name ASC`,
  )
    .bind(gameId)
    .all<EntryWithUser>();
  return results;
}

export async function listGamesForUser(userId: string): Promise<GameWithEntryCount[]> {
  const env = await getEnv();
  const { results } = await env.DB.prepare(
    `SELECT games.*,
            game_entries.id as entry_id,
            game_entries.status as entry_status,
            (SELECT COUNT(*) FROM game_entries ge2 WHERE ge2.game_id = games.id) as entry_count
     FROM games
     JOIN game_entries ON game_entries.game_id = games.id
     WHERE game_entries.user_id = ?
     ORDER BY games.created_at DESC`,
  )
    .bind(userId)
    .all<GameWithEntryCount>();
  return results;
}
