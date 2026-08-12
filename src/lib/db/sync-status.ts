import { getEnv } from "@/lib/cloudflare";

export type SyncKind = "full_schedule" | "live_scores";

export interface SyncStatusRow {
  kind: SyncKind;
  last_synced_at: string;
  fixtures_synced: number;
}

export async function getSyncStatus(kind: SyncKind, env?: Env): Promise<SyncStatusRow | null> {
  const e = env ?? (await getEnv());
  const row = await e.DB.prepare("SELECT * FROM sync_status WHERE kind = ?")
    .bind(kind)
    .first<SyncStatusRow>();
  return row ?? null;
}

export async function recordSync(env: Env, kind: SyncKind, fixturesSynced: number): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO sync_status (kind, last_synced_at, fixtures_synced) VALUES (?, datetime('now'), ?)
     ON CONFLICT (kind) DO UPDATE SET last_synced_at = datetime('now'), fixtures_synced = excluded.fixtures_synced`,
  )
    .bind(kind, fixturesSynced)
    .run();
}

/** Cron helper: is a sync kind due, given a minimum interval in hours? */
export async function isSyncDue(env: Env, kind: SyncKind, minIntervalHours: number): Promise<boolean> {
  const status = await getSyncStatus(kind, env);
  if (!status) return true;
  const row = await env.DB.prepare(
    `SELECT datetime(last_synced_at) <= datetime('now', ?) as due FROM sync_status WHERE kind = ?`,
  )
    .bind(`-${minIntervalHours} hours`, kind)
    .first<{ due: number }>();
  return !!row?.due;
}
