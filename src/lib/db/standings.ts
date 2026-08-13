import { getEnv } from "@/lib/cloudflare";
import { runBatchedStatements } from "./fixtures";

export interface TeamStandingRow {
  id: string;
  team_id: string;
  league_id: string;
  season: string;
  position: number;
  points: number | null;
  played: number | null;
  won: number | null;
  drawn: number | null;
  lost: number | null;
  goals_for: number | null;
  goals_against: number | null;
}

export interface TeamStandingEntry {
  teamId: string;
  position: number;
  points: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
}

export function buildUpsertTeamStandingStatement(
  env: Env,
  params: TeamStandingEntry & { leagueId: string; season: string },
): D1PreparedStatement {
  return env.DB.prepare(
    `INSERT INTO team_standings
       (id, team_id, league_id, season, position, points, played, won, drawn, lost, goals_for, goals_against)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (team_id, league_id, season) DO UPDATE SET
       position = excluded.position, points = excluded.points, played = excluded.played,
       won = excluded.won, drawn = excluded.drawn, lost = excluded.lost,
       goals_for = excluded.goals_for, goals_against = excluded.goals_against`,
  ).bind(
    crypto.randomUUID(),
    params.teamId,
    params.leagueId,
    params.season,
    params.position,
    params.points,
    params.played,
    params.won,
    params.drawn,
    params.lost,
    params.goalsFor,
    params.goalsAgainst,
  );
}

export async function recordTeamStandings(
  env: Env,
  leagueId: string,
  season: string,
  entries: TeamStandingEntry[],
): Promise<void> {
  const statements = entries.map((e) =>
    buildUpsertTeamStandingStatement(env, { ...e, leagueId, season }),
  );
  await runBatchedStatements(env, statements);
}

export async function getPreviousSeasonPositions(
  teamIds: string[],
  env?: Env,
): Promise<Map<string, number>> {
  const e = env ?? (await getEnv());
  if (teamIds.length === 0) return new Map();

  const placeholders = teamIds.map(() => "?").join(",");
  const { results } = await e.DB.prepare(
    `SELECT team_id, position, season
     FROM team_standings
     WHERE team_id IN (${placeholders})
     ORDER BY team_id, season DESC`,
  )
    .bind(...teamIds)
    .all<{ team_id: string; position: number; season: string }>();

  const map = new Map<string, number>();
  for (const r of results) {
    if (!map.has(r.team_id)) map.set(r.team_id, r.position);
  }
  return map;
}
