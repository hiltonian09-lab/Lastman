import { getEnv } from "@/lib/cloudflare";

export interface TeamRow {
  id: string;
  name: string;
  short_name: string | null;
  crest_url: string | null;
  league_id: string;
  provider_id: string;
}

export async function getTeamsByProviderIds(
  providerIds: string[],
  env?: Env,
): Promise<Map<string, TeamRow>> {
  if (providerIds.length === 0) return new Map();
  const e = env ?? (await getEnv());
  const placeholders = providerIds.map(() => "?").join(",");
  const { results } = await e.DB.prepare(
    `SELECT * FROM teams WHERE provider_id IN (${placeholders})`,
  )
    .bind(...providerIds)
    .all<TeamRow>();
  return new Map(results.map((t) => [t.provider_id, t]));
}

export async function getTeamsByIds(ids: string[], env?: Env): Promise<Map<string, TeamRow>> {
  if (ids.length === 0) return new Map();
  const e = env ?? (await getEnv());
  const placeholders = ids.map(() => "?").join(",");
  const { results } = await e.DB.prepare(
    `SELECT * FROM teams WHERE id IN (${placeholders})`,
  )
    .bind(...ids)
    .all<TeamRow>();
  return new Map(results.map((t) => [t.id, t]));
}

export async function listTeamsByLeague(leagueId: string, env?: Env): Promise<TeamRow[]> {
  const e = env ?? (await getEnv());
  const { results } = await e.DB.prepare(
    "SELECT * FROM teams WHERE league_id = ? ORDER BY name",
  )
    .bind(leagueId)
    .all<TeamRow>();
  return results;
}
