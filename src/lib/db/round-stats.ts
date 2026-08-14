import { getEnv } from "@/lib/cloudflare";

export interface RoundSummary {
  id: string;
  round_number: number;
  deadline_at: string;
  lock_at: string;
  status: "upcoming" | "locked" | "resolved";
  wins: number;
  setbacks: number;
  pending: number;
}

export async function getRoundsWithStats(gameId: string): Promise<RoundSummary[]> {
  const env = await getEnv();
  const { results } = await env.DB.prepare(
    `SELECT rounds.id, rounds.round_number, rounds.deadline_at, rounds.lock_at, rounds.status,
            SUM(CASE WHEN picks.result = 'win' THEN 1 ELSE 0 END) as wins,
            SUM(CASE WHEN picks.result IN ('loss', 'draw') THEN 1 ELSE 0 END) as setbacks,
            SUM(CASE WHEN picks.result = 'pending' THEN 1 ELSE 0 END) as pending
     FROM rounds
     LEFT JOIN picks ON picks.round_id = rounds.id
     WHERE rounds.game_id = ?
     GROUP BY rounds.id
     ORDER BY rounds.round_number DESC`,
  )
    .bind(gameId)
    .all<RoundSummary>();
  return results;
}

export interface EntryLite {
  id: string;
  name: string;
}

/** Active entries with no pick row yet for a given round — for the "hasn't picked" chase-up list. */
export async function getEntriesWithoutPickForRound(
  gameId: string,
  roundId: string,
): Promise<EntryLite[]> {
  const env = await getEnv();
  const { results } = await env.DB.prepare(
    `SELECT game_entries.id, users.name
     FROM game_entries
     JOIN users ON users.id = game_entries.user_id
     WHERE game_entries.game_id = ? AND game_entries.status = 'active'
       AND NOT EXISTS (
         SELECT 1 FROM picks WHERE picks.game_entry_id = game_entries.id AND picks.round_id = ?
       )`,
  )
    .bind(gameId, roundId)
    .all<EntryLite>();
  return results;
}

export interface PickHistoryRow {
  round_number: number;
  team_name: string;
  result: "pending" | "win" | "loss" | "draw" | "void";
  auto_assigned: number;
  kickoff_at: string;
}

/** Only resolved-round picks — never reveal a pending pick, that's the whole fairness point. */
export async function getPickHistoryForEntry(entryId: string): Promise<PickHistoryRow[]> {
  const env = await getEnv();
  const { results } = await env.DB.prepare(
    `SELECT rounds.round_number, teams.name as team_name, picks.result,
            picks.auto_assigned, fixtures.kickoff_at
     FROM picks
     JOIN rounds ON rounds.id = picks.round_id
     JOIN teams ON teams.id = picks.team_id
     JOIN fixtures ON fixtures.id = picks.fixture_id
     WHERE picks.game_entry_id = ? AND picks.result != 'pending'
     ORDER BY rounds.round_number DESC`,
  )
    .bind(entryId)
    .all<PickHistoryRow>();
  return results;
}

export interface EntryDetail {
  id: string;
  user_id: string;
  name: string;
  status: "active" | "eliminated" | "winner";
  lives_remaining: number;
  joined_at: string;
  game_id: string;
  game_name: string;
  game_slug: string;
}

export async function getEntryDetail(entryId: string): Promise<EntryDetail | null> {
  const env = await getEnv();
  const row = await env.DB.prepare(
    `SELECT game_entries.id, game_entries.user_id, users.name, game_entries.status,
            game_entries.lives_remaining, game_entries.joined_at,
            games.id as game_id, games.name as game_name, games.slug as game_slug
     FROM game_entries
     JOIN users ON users.id = game_entries.user_id
     JOIN games ON games.id = game_entries.game_id
     WHERE game_entries.id = ?`,
  )
    .bind(entryId)
    .first<EntryDetail>();
  return row ?? null;
}
