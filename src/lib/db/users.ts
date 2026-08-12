import "server-only";
import { getEnv } from "@/lib/cloudflare";

export interface UserRow {
  id: string;
  email: string;
  password_hash: string | null;
  name: string;
  role: "player" | "platform_owner";
}

export async function getUserByEmail(email: string): Promise<UserRow | null> {
  const env = await getEnv();
  const row = await env.DB.prepare(
    "SELECT id, email, password_hash, name, role FROM users WHERE email = ?",
  )
    .bind(email.toLowerCase().trim())
    .first<UserRow>();
  return row ?? null;
}

export async function createUser(params: {
  email: string;
  name: string;
  passwordHash: string;
}): Promise<UserRow> {
  const env = await getEnv();
  const id = crypto.randomUUID();
  const email = params.email.toLowerCase().trim();

  await env.DB.prepare(
    "INSERT INTO users (id, email, password_hash, name, role) VALUES (?, ?, ?, ?, 'player')",
  )
    .bind(id, email, params.passwordHash, params.name.trim())
    .run();

  return { id, email, password_hash: params.passwordHash, name: params.name.trim(), role: "player" };
}
