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
