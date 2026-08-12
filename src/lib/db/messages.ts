import "server-only";
import { getEnv } from "@/lib/cloudflare";

export interface MessageRow {
  id: string;
  body: string;
  sent_at: string;
  sender_name: string;
}

export async function sendGameMessage(params: {
  gameId: string;
  senderId: string;
  body: string;
}): Promise<void> {
  const env = await getEnv();
  await env.DB.prepare(
    "INSERT INTO game_messages (id, game_id, sender_id, body) VALUES (?, ?, ?, ?)",
  )
    .bind(crypto.randomUUID(), params.gameId, params.senderId, params.body)
    .run();
}

export async function listGameMessages(gameId: string): Promise<MessageRow[]> {
  const env = await getEnv();
  const { results } = await env.DB.prepare(
    `SELECT game_messages.id, game_messages.body, game_messages.sent_at, users.name as sender_name
     FROM game_messages
     JOIN users ON users.id = game_messages.sender_id
     WHERE game_messages.game_id = ?
     ORDER BY game_messages.sent_at DESC
     LIMIT 20`,
  )
    .bind(gameId)
    .all<MessageRow>();
  return results;
}
