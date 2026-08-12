import { getEnv } from "@/lib/cloudflare";

const BASE_URL = "https://v3.football.api-sports.io";

// Free tier is 100 req/day — every call must go through the KV cache.
// Fixtures/results don't need to be fresher than this during normal play.
const DEFAULT_TTL_SECONDS = 60 * 30;

interface ApiFootballResponse<T> {
  response: T;
  errors: unknown[];
}

async function cachedFetch<T>(
  path: string,
  params: Record<string, string | number>,
  ttlSeconds = DEFAULT_TTL_SECONDS,
): Promise<T> {
  const env = await getEnv();
  const query = new URLSearchParams(
    Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
  );
  const cacheKey = `api-football:${path}?${query.toString()}`;

  const cached = await env.CACHE.get(cacheKey, "json");
  if (cached) return cached as T;

  const res = await fetch(`${BASE_URL}${path}?${query.toString()}`, {
    headers: {
      "x-apisports-key": env.API_FOOTBALL_KEY,
    },
  });

  if (!res.ok) {
    throw new Error(`API-Football request failed: ${res.status} ${path}`);
  }

  const data = (await res.json()) as ApiFootballResponse<T>;
  await env.CACHE.put(cacheKey, JSON.stringify(data.response), {
    expirationTtl: ttlSeconds,
  });

  return data.response;
}

export interface ApiLeague {
  league: { id: number; name: string; logo: string; type: string };
  country: { name: string; code: string | null };
}

export function getLeagues(country?: string) {
  return cachedFetch<ApiLeague[]>(
    "/leagues",
    country ? { country } : {},
    60 * 60 * 24, // leagues rarely change — cache a full day
  );
}

export interface ApiFixture {
  fixture: {
    id: number;
    date: string;
    status: { short: string; long: string };
  };
  league: { id: number; name: string; round: string };
  teams: {
    home: { id: number; name: string; logo: string };
    away: { id: number; name: string; logo: string };
  };
  goals: { home: number | null; away: number | null };
}

export function getFixturesByLeagueAndSeason(
  leagueId: number,
  season: number,
  round?: string,
) {
  return cachedFetch<ApiFixture[]>("/fixtures", {
    league: leagueId,
    season,
    ...(round ? { round } : {}),
  });
}

export function getFixturesByDateRange(
  leagueId: number,
  season: number,
  from: string,
  to: string,
) {
  return cachedFetch<ApiFixture[]>(
    "/fixtures",
    { league: leagueId, season, from, to },
    // shorter TTL close to matchday — round-locking logic should call this
    // sparingly (the Cron worker, not every page load)
    60 * 5,
  );
}
