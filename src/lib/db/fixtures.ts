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

export interface UpsertFixtureParams {
  externalId: string;
  leagueId: string;
  homeTeamId: string;
  awayTeamId: string;
  kickoffAt: string;
  status: FixtureRow["status"];
  homeScore: number | null;
  awayScore: number | null;
}

/**
 * A single fixture's upsert as a prepared-but-not-executed statement, so
 * callers can batch many together into one D1 round-trip via env.DB.batch()
 * instead of awaiting them one at a time. No pre-SELECT needed: a fresh
 * random id is only used on first insert — on conflict, SQLite leaves the
 * existing row's id untouched since the UPDATE clause never sets it.
 */
export function buildUpsertFixtureStatement(
  env: Env,
  params: UpsertFixtureParams,
): D1PreparedStatement {
  return env.DB.prepare(
    `INSERT INTO fixtures (id, external_id, league_id, home_team_id, away_team_id, kickoff_at, status, home_score, away_score, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT (external_id) DO UPDATE SET
       status = excluded.status, home_score = excluded.home_score,
       away_score = excluded.away_score, kickoff_at = excluded.kickoff_at,
       updated_at = datetime('now')`,
  ).bind(
    crypto.randomUUID(),
    params.externalId,
    params.leagueId,
    params.homeTeamId,
    params.awayTeamId,
    params.kickoffAt,
    params.status,
    params.homeScore,
    params.awayScore,
  );
}

const BATCH_CHUNK_SIZE = 50;

/** Runs many prepared statements as chunked D1 batches — each chunk is one network round-trip. */
export async function runBatchedStatements(
  env: Env,
  statements: D1PreparedStatement[],
): Promise<void> {
  for (let i = 0; i < statements.length; i += BATCH_CHUNK_SIZE) {
    await env.DB.batch(statements.slice(i, i + BATCH_CHUNK_SIZE));
  }
}

export async function getUsedTeamIds(gameEntryId: string, env?: Env): Promise<Set<string>> {
  const e = env ?? (await getEnv());
  const { results } = await e.DB.prepare(
    `SELECT team_id FROM picks WHERE game_entry_id = ? AND result != 'void'`,
  )
    .bind(gameEntryId)
    .all<{ team_id: string }>();
  return new Set(results.map((r) => r.team_id));
}
