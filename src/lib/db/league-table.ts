import { getEnv } from "@/lib/cloudflare";
import { listTeamsByLeague } from "./teams";
import type { FormResult } from "./team-form";

interface FinishedLeagueFixtureRow {
  home_team_id: string;
  away_team_id: string;
  home_score: number;
  away_score: number;
  kickoff_at: string;
}

interface TeamStats {
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  results: FormResult[];
}

export interface LeagueTableRow {
  teamId: string;
  teamName: string;
  position: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  form: FormResult[];
}

export async function getLeagueTable(
  leagueId: string,
  formLimit = 5,
  env?: Env,
): Promise<LeagueTableRow[]> {
  const e = env ?? (await getEnv());

  const [teamsInLeague, { results }] = await Promise.all([
    listTeamsByLeague(leagueId, e),
    e.DB.prepare(
      `SELECT home_team_id, away_team_id, home_score, away_score, kickoff_at
       FROM fixtures
       WHERE league_id = ? AND status = 'finished' AND home_score IS NOT NULL AND away_score IS NOT NULL
       ORDER BY kickoff_at ASC`,
    )
      .bind(leagueId)
      .all<FinishedLeagueFixtureRow>(),
  ]);

  const stats = new Map<string, TeamStats>();

  function ensureTeam(teamId: string): TeamStats {
    if (!stats.has(teamId)) {
      stats.set(teamId, {
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        points: 0,
        results: [],
      });
    }
    return stats.get(teamId)!;
  }

  // Seed every team in the league up front (0 played, 0 points) so the table
  // shows the full field before a ball's been kicked, rather than being
  // empty until the first fixtures resolve.
  const teamNameById = new Map(teamsInLeague.map((t) => [t.id, t.name]));
  for (const team of teamsInLeague) ensureTeam(team.id);

  for (const f of results) {
    const home = ensureTeam(f.home_team_id);
    const away = ensureTeam(f.away_team_id);

    home.played += 1;
    away.played += 1;
    home.goalsFor += f.home_score;
    home.goalsAgainst += f.away_score;
    away.goalsFor += f.away_score;
    away.goalsAgainst += f.home_score;

    if (f.home_score > f.away_score) {
      home.won += 1;
      home.points += 3;
      home.results.push("W");
      away.lost += 1;
      away.results.push("L");
    } else if (f.home_score === f.away_score) {
      home.drawn += 1;
      home.points += 1;
      home.results.push("D");
      away.drawn += 1;
      away.points += 1;
      away.results.push("D");
    } else {
      home.lost += 1;
      home.results.push("L");
      away.won += 1;
      away.points += 3;
      away.results.push("W");
    }
  }

  const teamIds = Array.from(stats.keys());

  const rows: LeagueTableRow[] = teamIds.map((teamId, index) => {
    const s = stats.get(teamId)!;
    const name = teamNameById.get(teamId) ?? "Unknown";
    return {
      teamId,
      teamName: name,
      position: index + 1,
      played: s.played,
      won: s.won,
      drawn: s.drawn,
      lost: s.lost,
      goalsFor: s.goalsFor,
      goalsAgainst: s.goalsAgainst,
      goalDifference: s.goalsFor - s.goalsAgainst,
      points: s.points,
      form: s.results.slice(-formLimit).reverse(),
    };
  });

  return rows
    .sort((a, b) =>
      b.points - a.points ||
      b.goalDifference - a.goalDifference ||
      b.goalsFor - a.goalsFor ||
      a.teamName.localeCompare(b.teamName),
    )
    .map((r, i) => ({ ...r, position: i + 1 }));
}
