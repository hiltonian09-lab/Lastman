import "server-only";
import { getEnv } from "@/lib/cloudflare";
import { getGameById } from "./games";
import { sendEmail } from "@/lib/email/resend";
import { broadcastEmail } from "@/lib/email/templates";
import { getOrigin } from "@/lib/http/origin";

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

  await emailActiveEntrants(env, params.gameId, params.senderId, params.body);
}

async function emailActiveEntrants(
  env: Env,
  gameId: string,
  senderId: string,
  body: string,
): Promise<void> {
  const [game, sender, origin] = await Promise.all([
    getGameById(gameId, env),
    env.DB.prepare("SELECT name FROM users WHERE id = ?").bind(senderId).first<{ name: string }>(),
    getOrigin(),
  ]);
  if (!game || !sender) return;

  const { results: entrants } = await env.DB.prepare(
    `SELECT users.email FROM game_entries
     JOIN users ON users.id = game_entries.user_id
     WHERE game_entries.game_id = ? AND game_entries.status = 'active'`,
  )
    .bind(gameId)
    .all<{ email: string }>();

  const { subject, html } = broadcastEmail({
    gameName: game.name,
    senderName: sender.name,
    body,
    gameUrl: `${origin}/games/${game.slug}`,
  });

  for (const entrant of entrants) {
    await sendEmail({ to: entrant.email, subject, html }, env);
  }
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
