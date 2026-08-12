import { getEnv } from "@/lib/cloudflare";

export interface FeedbackRow {
  id: string;
  message: string;
  created_at: string;
  user_name: string;
  user_email: string;
}

export async function submitFeedback(userId: string, message: string): Promise<void> {
  const env = await getEnv();
  await env.DB.prepare("INSERT INTO feedback (id, user_id, message) VALUES (?, ?, ?)")
    .bind(crypto.randomUUID(), userId, message)
    .run();
}

export async function listFeedback(limit = 50): Promise<FeedbackRow[]> {
  const env = await getEnv();
  const { results } = await env.DB.prepare(
    `SELECT feedback.id, feedback.message, feedback.created_at, users.name as user_name, users.email as user_email
     FROM feedback
     JOIN users ON users.id = feedback.user_id
     ORDER BY feedback.created_at DESC
     LIMIT ?`,
  )
    .bind(limit)
    .all<FeedbackRow>();
  return results;
}
