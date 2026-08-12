import "server-only";
import { cookies } from "next/headers";
import { getEnv } from "@/lib/cloudflare";

const SESSION_COOKIE = "session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: "player" | "platform_owner";
}

export async function createSession(userId: string): Promise<void> {
  const env = await getEnv();
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

  await env.DB.prepare(
    "INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)",
  )
    .bind(sessionId, userId, expiresAt)
    .run();

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAt),
  });
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;

  const env = await getEnv();
  const row = await env.DB.prepare(
    `SELECT users.id, users.email, users.name, users.role, sessions.expires_at
     FROM sessions JOIN users ON users.id = sessions.user_id
     WHERE sessions.id = ?`,
  )
    .bind(sessionId)
    .first<{
      id: string;
      email: string;
      name: string;
      role: "player" | "platform_owner";
      expires_at: string;
    }>();

  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await env.DB.prepare("DELETE FROM sessions WHERE id = ?").bind(sessionId).run();
    return null;
  }

  return { id: row.id, email: row.email, name: row.name, role: row.role };
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (sessionId) {
    const env = await getEnv();
    await env.DB.prepare("DELETE FROM sessions WHERE id = ?").bind(sessionId).run();
  }
  cookieStore.delete(SESSION_COOKIE);
}
