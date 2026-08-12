import { getEnv } from "@/lib/cloudflare";

const BASE_URL = "https://api.football-data.org/v4";

// Free tier is 10 req/min — cache aggressively, never call this on every page load.
const DEFAULT_TTL_SECONDS = 60 * 15;

async function cachedFetch<T>(
  path: string,
  ttlSeconds = DEFAULT_TTL_SECONDS,
  env?: Env,
): Promise<T> {
  const e = env ?? (await getEnv());
  const cacheKey = `football-data:${path}`;

  const cached = await e.CACHE.get(cacheKey, "json");
  if (cached) return cached as T;

  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "X-Auth-Token": e.FOOTBALL_DATA_API_TOKEN },
  });

  if (!res.ok) {
    throw new Error(`football-data.org request failed: ${res.status} ${path}`);
  }

  const data = (await res.json()) as T;
  await e.CACHE.put(cacheKey, JSON.stringify(data), { expirationTtl: ttlSeconds });
  return data;
}

export interface FdTeam {
  id: number;
  name: string;
  shortName: string;
  tla: string;
  crest: string;
}

export interface FdMatch {
  id: number;
  utcDate: string;
  status: "SCHEDULED" | "TIMED" | "IN_PLAY" | "PAUSED" | "FINISHED" | "POSTPONED" | "SUSPENDED" | "CANCELLED";
  matchday: number;
  homeTeam: FdTeam;
  awayTeam: FdTeam;
  score: {
    fullTime: { home: number | null; away: number | null };
  };
}

interface FdMatchesResponse {
  matches: FdMatch[];
}

interface FdTeamsResponse {
  teams: FdTeam[];
}

/** competitionCode = football-data.org code, e.g. "PL", "ELC", "PD" */
export function getTeams(competitionCode: string, env?: Env) {
  return cachedFetch<FdTeamsResponse>(
    `/competitions/${competitionCode}/teams`,
    60 * 60 * 24, // squads barely change day to day
    env,
  ).then((r) => r.teams);
}

export function getMatchesInRange(
  competitionCode: string,
  dateFrom: string,
  dateTo: string,
  env?: Env,
) {
  return cachedFetch<FdMatchesResponse>(
    `/competitions/${competitionCode}/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`,
    60 * 10,
    env,
  ).then((r) => r.matches);
}

export function getMatchesByMatchday(competitionCode: string, matchday: number, env?: Env) {
  return cachedFetch<FdMatchesResponse>(
    `/competitions/${competitionCode}/matches?matchday=${matchday}`,
    60 * 10,
    env,
  ).then((r) => r.matches);
}
