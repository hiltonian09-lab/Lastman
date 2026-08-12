import { getEnv } from "@/lib/cloudflare";

export interface UpcomingFixture {
  home_team: string;
  away_team: string;
  kickoff_at: string;
  league_name: string;
}

/**
 * The next few fixtures across a game's leagues, regardless of the strict
 * pick-pool gameweek window — used purely for display, so a game with no
 * pickable fixtures this week (e.g. season hasn't started, or the covered
 * league is between rounds) still shows something instead of looking empty
 * or broken.
 */
export async function getUpcomingFixturesPreview(
  leagueIds: string[],
  limit = 8,
): Promise<UpcomingFixture[]> {
  if (leagueIds.length === 0) return [];
  const env = await getEnv();
  const placeholders = leagueIds.map(() => "?").join(",");

  const { results } = await env.DB.prepare(
    `SELECT home.name as home_team, away.name as away_team,
            fixtures.kickoff_at, leagues.name as league_name
     FROM fixtures
     JOIN teams home ON home.id = fixtures.home_team_id
     JOIN teams away ON away.id = fixtures.away_team_id
     JOIN leagues ON leagues.id = fixtures.league_id
     WHERE fixtures.league_id IN (${placeholders})
       AND datetime(fixtures.kickoff_at) >= datetime('now')
     ORDER BY fixtures.kickoff_at
     LIMIT ?`,
  )
    .bind(...leagueIds, limit)
    .all<UpcomingFixture>();

  return results;
}
