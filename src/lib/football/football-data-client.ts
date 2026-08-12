import { getEnv } from "@/lib/cloudflare";

const BASE_URL = "https://api.football-data.org/v4";

// Free tier is 10 req/min — cache aggressively, never call this on every page load.
const DEFAULT_TTL_SECONDS = 60 * 15;

// 60s / 10 req = 6000ms exactly at the limit — pad it so we're never on the edge.
// A single tick can fire up to ~12 real calls back to back (6 for live-scores +
// 6 more on the days the full-schedule sync is also due), so every real call —
// regardless of which sync job or league it's for — is paced through this one
// choke point rather than relying on each job separately staying under budget.
const MIN_CALL_INTERVAL_MS = 6_500;
let lastCallAt = 0;

async function waitForRateLimit(): Promise<void> {
  const elapsed = Date.now() - lastCallAt;
  if (elapsed < MIN_CALL_INTERVAL_MS) {
    await new Promise((resolve) => setTimeout(resolve, MIN_CALL_INTERVAL_MS - elapsed));
  }
  lastCallAt = Date.now();
}

async function cachedFetch<T>(
  path: string,
  ttlSeconds = DEFAULT_TTL_SECONDS,
  env?: Env,
): Promise<T> {
  const e = env ?? (await getEnv());
  const cacheKey = `football-data:${path}`;

  const cached = await e.CACHE.get(cacheKey, "json");
  if (cached) return cached as T;

  await waitForRateLimit();
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

/** Full season, one call — used only by the cron's full-schedule sync (every 3 days). */
export function getAllMatches(competitionCode: string, env?: Env) {
  return cachedFetch<FdMatchesResponse>(
    `/competitions/${competitionCode}/matches`,
    60 * 60 * 24, // this is already a 3-day-cadence job; no need for a short TTL on top
    env,
  ).then((r) => r.matches);
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
