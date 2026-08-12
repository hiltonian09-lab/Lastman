import "server-only";
import { getEnv } from "@/lib/cloudflare";

export interface TeamRow {
  id: string;
  name: string;
  short_name: string | null;
  crest_url: string | null;
  league_id: string;
  provider_id: string;
}

export async function getTeamsByProviderIds(providerIds: string[]): Promise<Map<string, TeamRow>> {
  if (providerIds.length === 0) return new Map();
  const env = await getEnv();
  const placeholders = providerIds.map(() => "?").join(",");
  const { results } = await env.DB.prepare(
    `SELECT * FROM teams WHERE provider_id IN (${placeholders})`,
  )
    .bind(...providerIds)
    .all<TeamRow>();
  return new Map(results.map((t) => [t.provider_id, t]));
}

export async function getTeamsByIds(ids: string[]): Promise<Map<string, TeamRow>> {
  if (ids.length === 0) return new Map();
  const env = await getEnv();
  const placeholders = ids.map(() => "?").join(",");
  const { results } = await env.DB.prepare(
    `SELECT * FROM teams WHERE id IN (${placeholders})`,
  )
    .bind(...ids)
    .all<TeamRow>();
  return new Map(results.map((t) => [t.id, t]));
}
