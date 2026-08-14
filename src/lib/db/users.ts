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

export async function getUserById(id: string, env?: Env): Promise<UserRow | null> {
  const e = env ?? (await getEnv());
  const row = await e.DB.prepare(
    "SELECT id, email, password_hash, name, role FROM users WHERE id = ?",
  )
    .bind(id)
    .first<UserRow>();
  return row ?? null;
}

/**
 * Bootstrap mechanism for the platform_owner role — no self-serve UI for
 * this, deliberately. Any account whose email is listed in the
 * PLATFORM_OWNER_EMAILS secret gets promoted the moment it logs in or signs
 * up. Idempotent, safe to call every time.
 */
export async function syncPlatformOwnerRole(userId: string, email: string): Promise<void> {
  const env = await getEnv();
  const owners = (env.PLATFORM_OWNER_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (!owners.includes(email.toLowerCase())) return;

  await env.DB.prepare("UPDATE users SET role = 'platform_owner' WHERE id = ? AND role != 'platform_owner'")
    .bind(userId)
    .run();
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
