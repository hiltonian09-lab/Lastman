// Note: no `import "server-only"` here — this module is shared with the
// cron worker entry, which wrangler bundles directly (not through Next.js's
// bundler, which is the only place the `server-only` alias resolves).
import { getEnv } from "@/lib/cloudflare";

export interface LeagueRow {
  id: string;
  name: string;
  country: string | null;
  provider_id: string;
}

export async function listLeagues(env?: Env): Promise<LeagueRow[]> {
  const e = env ?? (await getEnv());
  const { results } = await e.DB.prepare(
    "SELECT id, name, country, provider_id FROM leagues ORDER BY name",
  ).all<LeagueRow>();
  return results;
}

export async function getLeaguesByIds(ids: string[], env?: Env): Promise<LeagueRow[]> {
  if (ids.length === 0) return [];
  const e = env ?? (await getEnv());
  const placeholders = ids.map(() => "?").join(",");
  const { results } = await e.DB.prepare(
    `SELECT id, name, country, provider_id FROM leagues WHERE id IN (${placeholders})`,
  )
    .bind(...ids)
    .all<LeagueRow>();
  return results;
}

/**
 * Leagues whose full-schedule sync is missing or stale. Only ever returns a
 * handful at a time (capped by the caller) so a single cron invocation
 * never has to process all 6 leagues' ~380 fixtures each in one go — that's
 * what was causing Cloudflare to cut the invocation off mid-run.
 */
export async function getLeaguesDueForFullSync(
  env: Env,
  thresholdHours: number,
  limit: number,
): Promise<LeagueRow[]> {
  const { results } = await env.DB.prepare(
    `SELECT id, name, country, provider_id FROM leagues
     WHERE full_schedule_synced_at IS NULL
        OR datetime(full_schedule_synced_at) <= datetime('now', ?)
     ORDER BY full_schedule_synced_at IS NOT NULL, full_schedule_synced_at
     LIMIT ?`,
  )
    .bind(`-${thresholdHours} hours`, limit)
    .all<LeagueRow>();
  return results;
}

export async function markLeagueFullSynced(env: Env, leagueId: string): Promise<void> {
  await env.DB.prepare("UPDATE leagues SET full_schedule_synced_at = datetime('now') WHERE id = ?")
    .bind(leagueId)
    .run();
}
