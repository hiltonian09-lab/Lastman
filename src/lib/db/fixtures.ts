import "server-only";
import { getEnv } from "@/lib/cloudflare";

export interface FixtureRow {
  id: string;
  external_id: string;
  league_id: string;
  home_team_id: string;
  away_team_id: string;
  kickoff_at: string;
  status: "scheduled" | "live" | "postponed" | "finished" | "abandoned";
  home_score: number | null;
  away_score: number | null;
}

const STATUS_MAP: Record<string, FixtureRow["status"]> = {
  SCHEDULED: "scheduled",
  TIMED: "scheduled",
  IN_PLAY: "live",
  PAUSED: "live",
  FINISHED: "finished",
  POSTPONED: "postponed",
  SUSPENDED: "postponed",
  CANCELLED: "abandoned",
};

export function mapMatchStatus(fdStatus: string): FixtureRow["status"] {
  return STATUS_MAP[fdStatus] ?? "scheduled";
}

export async function upsertFixture(params: {
  externalId: string;
  leagueId: string;
  homeTeamId: string;
  awayTeamId: string;
  kickoffAt: string;
  status: FixtureRow["status"];
  homeScore: number | null;
  awayScore: number | null;
}): Promise<string> {
  const env = await getEnv();
  const existing = await env.DB.prepare("SELECT id FROM fixtures WHERE external_id = ?")
    .bind(params.externalId)
    .first<{ id: string }>();

  const id = existing?.id ?? crypto.randomUUID();

  await env.DB.prepare(
    `INSERT INTO fixtures (id, external_id, league_id, home_team_id, away_team_id, kickoff_at, status, home_score, away_score, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT (external_id) DO UPDATE SET
       status = excluded.status, home_score = excluded.home_score,
       away_score = excluded.away_score, kickoff_at = excluded.kickoff_at,
       updated_at = datetime('now')`,
  )
    .bind(
      id,
      params.externalId,
      params.leagueId,
      params.homeTeamId,
      params.awayTeamId,
      params.kickoffAt,
      params.status,
      params.homeScore,
      params.awayScore,
    )
    .run();

  return id;
}

export async function getUsedTeamIds(gameEntryId: string): Promise<Set<string>> {
  const env = await getEnv();
  const { results } = await env.DB.prepare(
    `SELECT team_id FROM picks WHERE game_entry_id = ? AND result != 'void'`,
  )
    .bind(gameEntryId)
    .all<{ team_id: string }>();
  return new Set(results.map((r) => r.team_id));
}
