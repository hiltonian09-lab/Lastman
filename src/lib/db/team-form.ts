import { getEnv } from "@/lib/cloudflare";

export type FormResult = "W" | "D" | "L";

interface FinishedFixtureRow {
  home_team_id: string;
  away_team_id: string;
  home_score: number;
  away_score: number;
  kickoff_at: string;
}

/**
 * Recent form (last 5 results) for a set of teams, computed entirely from
 * fixtures already sitting in D1 — no extra football-data.org calls needed,
 * since the full-schedule sync already pulls the whole season including
 * already-played matches with final scores.
 */
export async function getRecentFormForTeams(
  teamIds: string[],
  limit = 5,
  env?: Env,
): Promise<Map<string, FormResult[]>> {
  const form = new Map<string, FormResult[]>();
  if (teamIds.length === 0) return form;

  const e = env ?? (await getEnv());
  const placeholders = teamIds.map(() => "?").join(",");

  const { results } = await e.DB.prepare(
    `SELECT home_team_id, away_team_id, home_score, away_score, kickoff_at
     FROM fixtures
     WHERE status = 'finished' AND (home_team_id IN (${placeholders}) OR away_team_id IN (${placeholders}))
     ORDER BY kickoff_at DESC`,
  )
    .bind(...teamIds, ...teamIds)
    .all<FinishedFixtureRow>();

  for (const teamId of teamIds) {
    const teamResults: FormResult[] = [];
    for (const fixture of results) {
      if (teamResults.length >= limit) break;
      const isHome = fixture.home_team_id === teamId;
      const isAway = fixture.away_team_id === teamId;
      if (!isHome && !isAway) continue;

      const own = isHome ? fixture.home_score : fixture.away_score;
      const opp = isHome ? fixture.away_score : fixture.home_score;
      if (own > opp) teamResults.push("W");
      else if (own === opp) teamResults.push("D");
      else teamResults.push("L");
    }
    form.set(teamId, teamResults);
  }

  return form;
}
