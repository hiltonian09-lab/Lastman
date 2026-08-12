import "server-only";
import { getEnv } from "@/lib/cloudflare";
import type { RoundRow } from "./rounds";

export interface GameStatsSnapshotRow {
  id: string;
  game_id: string;
  round_id: string;
  round_number: number;
  active_players: number;
  eliminated_this_round: number;
  total_picks: number;
  auto_assigned_picks: number;
  created_at: string;
}

export interface RoundTrendPoint {
  round_number: number;
  active_players: number;
  eliminated_this_round: number;
  total_picks: number;
  auto_assigned_picks: number;
}

export async function recordRoundSnapshot(
  round: RoundRow,
  env?: Env,
): Promise<GameStatsSnapshotRow | null> {
  const e = env ?? (await getEnv());

  const existing = await e.DB.prepare(
    "SELECT id FROM game_stats_snapshots WHERE game_id = ? AND round_id = ?",
  )
    .bind(round.game_id, round.id)
    .first<{ id: string }>();
  if (existing) return null;

  const activeRow = await e.DB.prepare(
    "SELECT COUNT(*) as count FROM game_entries WHERE game_id = ? AND status = 'active'",
  )
    .bind(round.game_id)
    .first<{ count: number }>();
  const activePlayers = activeRow?.count ?? 0;

  const eliminatedThisRoundRow = await e.DB.prepare(
    "SELECT COUNT(*) as count FROM game_entries WHERE game_id = ? AND eliminated_at_round_id = ?",
  )
    .bind(round.game_id, round.id)
    .first<{ count: number }>();
  const eliminatedThisRound = eliminatedThisRoundRow?.count ?? 0;

  const picksRow = await e.DB.prepare(
    `SELECT
       COUNT(*) as total,
       SUM(auto_assigned) as auto_assigned
     FROM picks
     WHERE round_id = ?`,
  )
    .bind(round.id)
    .first<{ total: number; auto_assigned: number }>();

  const totalPicks = picksRow?.total ?? 0;
  const autoAssignedPicks = picksRow?.auto_assigned ?? 0;

  const id = crypto.randomUUID();

  await e.DB.prepare(
    `INSERT INTO game_stats_snapshots
       (id, game_id, round_id, round_number, active_players, eliminated_this_round,
        total_picks, auto_assigned_picks)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      round.game_id,
      round.id,
      round.round_number,
      activePlayers,
      eliminatedThisRound,
      totalPicks,
      autoAssignedPicks,
    )
    .run();

  return {
    id,
    game_id: round.game_id,
    round_id: round.id,
    round_number: round.round_number,
    active_players: activePlayers,
    eliminated_this_round: eliminatedThisRound,
    total_picks: totalPicks,
    auto_assigned_picks: autoAssignedPicks,
    created_at: new Date().toISOString(),
  };
}

export async function getGameTrend(
  gameId: string,
  env?: Env,
): Promise<RoundTrendPoint[]> {
  const e = env ?? (await getEnv());
  const { results } = await e.DB.prepare(
    `SELECT round_number, active_players, eliminated_this_round,
            total_picks, auto_assigned_picks
     FROM game_stats_snapshots
     WHERE game_id = ?
     ORDER BY round_number ASC`,
  )
    .bind(gameId)
    .all<RoundTrendPoint>();
  return results;
}
