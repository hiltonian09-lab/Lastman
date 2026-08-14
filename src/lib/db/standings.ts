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

export interface TeamStandingsHistoryRow {
  teamId: string;
  teamName: string;
  positionsBySeason: Record<string, number>;
}

/** All finishing positions on record for every team in a league, most recent
 * season first — used for the "last 3 years" history table on /leagues/[id].
 * Teams that were promoted/relegated mid-window simply have gaps for the
 * seasons they weren't in this league. */
export async function getStandingsHistory(
  leagueId: string,
  env?: Env,
): Promise<{ seasons: string[]; teams: TeamStandingsHistoryRow[] }> {
  const e = env ?? (await getEnv());
  const { results } = await e.DB.prepare(
    `SELECT team_standings.team_id, teams.name as team_name, team_standings.season, team_standings.position
     FROM team_standings
     JOIN teams ON teams.id = team_standings.team_id
     WHERE team_standings.league_id = ?
     ORDER BY team_standings.season DESC, team_standings.position ASC`,
  )
    .bind(leagueId)
    .all<{ team_id: string; team_name: string; season: string; position: number }>();

  const seasons = Array.from(new Set(results.map((r) => r.season))).sort().reverse();

  const teamsById = new Map<string, TeamStandingsHistoryRow>();
  for (const r of results) {
    let team = teamsById.get(r.team_id);
    if (!team) {
      team = { teamId: r.team_id, teamName: r.team_name, positionsBySeason: {} };
      teamsById.set(r.team_id, team);
    }
    team.positionsBySeason[r.season] = r.position;
  }

  const teams = Array.from(teamsById.values()).sort((a, b) => {
    const mostRecent = seasons[0];
    const posA = a.positionsBySeason[mostRecent] ?? 999;
    const posB = b.positionsBySeason[mostRecent] ?? 999;
    return posA - posB;
  });

  return { seasons, teams };
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
