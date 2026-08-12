import "server-only";
import { getEnv } from "@/lib/cloudflare";

export interface LeagueRow {
  id: string;
  name: string;
  country: string | null;
  provider_id: string;
}

export async function listLeagues(): Promise<LeagueRow[]> {
  const env = await getEnv();
  const { results } = await env.DB.prepare(
    "SELECT id, name, country, provider_id FROM leagues ORDER BY name",
  ).all<LeagueRow>();
  return results;
}

export async function getLeaguesByIds(ids: string[]): Promise<LeagueRow[]> {
  if (ids.length === 0) return [];
  const env = await getEnv();
  const placeholders = ids.map(() => "?").join(",");
  const { results } = await env.DB.prepare(
    `SELECT id, name, country, provider_id FROM leagues WHERE id IN (${placeholders})`,
  )
    .bind(...ids)
    .all<LeagueRow>();
  return results;
}
