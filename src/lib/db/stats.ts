import { getEnv } from "@/lib/cloudflare";
import type { RoundRow } from "./rounds";
import type { PickRow } from "./picks";

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

export interface PlayerStats {
  roundsSurvived: number;
  picksUsed: number;
  wins: number;
  losses: number;
  draws: number;
  voids: number;
  currentStreak: number;
  bestStreak: number;
  livesRemaining: number;
  status: "active" | "eliminated" | "winner";
}

export async function getPlayerStats(
  entryId: string,
  env?: Env,
): Promise<PlayerStats | null> {
  const e = env ?? (await getEnv());

  const entry = await e.DB.prepare(
    `SELECT game_entries.status, game_entries.lives_remaining,
            game_entries.eliminated_at_round_id, rounds.round_number as eliminated_round_number
     FROM game_entries
     LEFT JOIN rounds ON rounds.id = game_entries.eliminated_at_round_id
     WHERE game_entries.id = ?`,
  )
    .bind(entryId)
    .first<{
      status: "active" | "eliminated" | "winner";
      lives_remaining: number;
      eliminated_at_round_id: string | null;
      eliminated_round_number: number | null;
    }>();
  if (!entry) return null;

  const { results } = await e.DB.prepare(
    `SELECT rounds.round_number, picks.result
     FROM picks
     JOIN rounds ON rounds.id = picks.round_id
     WHERE picks.game_entry_id = ? AND rounds.status = 'resolved'
     ORDER BY rounds.round_number ASC`,
  )
    .bind(entryId)
    .all<{ round_number: number; result: PickRow["result"] }>();

  const wins = results.filter((r) => r.result === "win").length;
  const losses = results.filter((r) => r.result === "loss").length;
  const draws = results.filter((r) => r.result === "draw").length;
  const voids = results.filter((r) => r.result === "void").length;
  const picksUsed = results.filter((r) => r.result !== "void").length;

  let currentStreak = 0;
  let bestStreak = 0;
  let running = 0;
  for (const r of results) {
    if (r.result === "win") {
      running += 1;
      bestStreak = Math.max(bestStreak, running);
    } else {
      running = 0;
    }
  }
  currentStreak = running;

  const roundsSurvived =
    entry.status === "eliminated"
      ? Math.max(0, (entry.eliminated_round_number ?? 1) - 1)
      : results.length;

  return {
    roundsSurvived,
    picksUsed,
    wins,
    losses,
    draws,
    voids,
    currentStreak,
    bestStreak,
    livesRemaining: entry.lives_remaining,
    status: entry.status,
  };
}

export interface GameSurvivalStats {
  totalEntries: number;
  activeOrWinner: number;
  eliminated: number;
  averageSurvivalLength: number;
}

export async function getGameSurvivalStats(
  gameId: string,
  env?: Env,
): Promise<GameSurvivalStats> {
  const e = env ?? (await getEnv());

  const { results } = await e.DB.prepare(
    `SELECT game_entries.status, game_entries.eliminated_at_round_id,
            rounds.round_number as eliminated_round_number
     FROM game_entries
     LEFT JOIN rounds ON rounds.id = game_entries.eliminated_at_round_id
     WHERE game_entries.game_id = ?`,
  )
    .bind(gameId)
    .all<{
      status: "active" | "eliminated" | "winner";
      eliminated_at_round_id: string | null;
      eliminated_round_number: number | null;
    }>();

  let totalRoundsSurvived = 0;
  let activeOrWinner = 0;
  let eliminated = 0;
  for (const r of results) {
    if (r.status === "eliminated") {
      eliminated += 1;
      totalRoundsSurvived += Math.max(0, (r.eliminated_round_number ?? 1) - 1);
    } else {
      activeOrWinner += 1;
    }
  }

  const totalEntries = results.length;
  const averageSurvivalLength =
    totalEntries > 0 ? totalRoundsSurvived / totalEntries : 0;

  return {
    totalEntries,
    activeOrWinner,
    eliminated,
    averageSurvivalLength,
  };
}
