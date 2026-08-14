import type { RoundRow } from "@/lib/db/rounds";

export interface ActiveEntry {
  id: string;
  user_id: string;
  lives_remaining: number;
}

export async function getRoundsPastDeadline(env: Env): Promise<RoundRow[]> {
  // lock_at is stored as ISO 8601 ("...T...Z") — must go through datetime()
  // to normalize before comparing, otherwise SQLite compares as plain text
  // and 'T' (0x54) > ' ' (0x20) breaks the sort.
  const { results } = await env.DB.prepare(
    `SELECT * FROM rounds WHERE status = 'upcoming' AND datetime(lock_at) <= datetime('now')`,
  ).all<RoundRow>();
  return results;
}

/** Rounds whose pick lock is within the next 24h, still upcoming, no reminder sent yet. */
export async function getRoundsNeedingReminder(env: Env): Promise<RoundRow[]> {
  const { results } = await env.DB.prepare(
    `SELECT * FROM rounds
     WHERE status = 'upcoming' AND reminder_sent_at IS NULL
       AND datetime(lock_at) <= datetime('now', '+24 hours')
       AND datetime(lock_at) > datetime('now')`,
  ).all<RoundRow>();
  return results;
}

export async function markReminderSent(env: Env, roundId: string): Promise<void> {
  await env.DB.prepare("UPDATE rounds SET reminder_sent_at = datetime('now') WHERE id = ?")
    .bind(roundId)
    .run();
}

export async function getActiveEntriesWithoutPick(
  env: Env,
  gameId: string,
  roundId: string,
): Promise<ActiveEntry[]> {
  const { results } = await env.DB.prepare(
    `SELECT game_entries.id, game_entries.user_id, game_entries.lives_remaining
     FROM game_entries
     WHERE game_entries.game_id = ? AND game_entries.status = 'active'
       AND NOT EXISTS (
         SELECT 1 FROM picks WHERE picks.game_entry_id = game_entries.id AND picks.round_id = ?
       )`,
  )
    .bind(gameId, roundId)
    .all<ActiveEntry>();
  return results;
}

export async function getLockedUnresolvedRounds(env: Env): Promise<RoundRow[]> {
  const { results } = await env.DB.prepare(
    `SELECT * FROM rounds WHERE status = 'locked'`,
  ).all<RoundRow>();
  return results;
}

export async function lockRound(env: Env, roundId: string): Promise<void> {
  await env.DB.prepare("UPDATE rounds SET status = 'locked' WHERE id = ?")
    .bind(roundId)
    .run();
}

export async function resolveRound(env: Env, roundId: string): Promise<void> {
  await env.DB.prepare("UPDATE rounds SET status = 'resolved' WHERE id = ?")
    .bind(roundId)
    .run();
}

export async function getActiveEntries(env: Env, gameId: string): Promise<ActiveEntry[]> {
  const { results } = await env.DB.prepare(
    `SELECT id, user_id, lives_remaining FROM game_entries WHERE game_id = ? AND status = 'active'`,
  )
    .bind(gameId)
    .all<ActiveEntry>();
  return results;
}

export async function countAllEntries(env: Env, gameId: string): Promise<number> {
  const row = await env.DB.prepare(
    "SELECT COUNT(*) as count FROM game_entries WHERE game_id = ?",
  )
    .bind(gameId)
    .first<{ count: number }>();
  return row?.count ?? 0;
}

export async function hasPickForRound(
  env: Env,
  gameEntryId: string,
  roundId: string,
): Promise<boolean> {
  const row = await env.DB.prepare(
    "SELECT id FROM picks WHERE game_entry_id = ? AND round_id = ?",
  )
    .bind(gameEntryId, roundId)
    .first();
  return !!row;
}

export async function insertAutoAssignedPick(
  env: Env,
  params: { roundId: string; gameEntryId: string; fixtureId: string; teamId: string },
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO picks (id, round_id, game_entry_id, fixture_id, team_id, auto_assigned)
     VALUES (?, ?, ?, ?, ?, 1)`,
  )
    .bind(crypto.randomUUID(), params.roundId, params.gameEntryId, params.fixtureId, params.teamId)
    .run();
}

export interface PickWithFixture {
  id: string;
  game_entry_id: string;
  team_id: string;
  result: "pending" | "win" | "loss" | "draw" | "void";
  fixture_status: "scheduled" | "live" | "postponed" | "finished" | "abandoned";
  home_team_id: string;
  away_team_id: string;
  home_score: number | null;
  away_score: number | null;
}

export async function getPicksWithFixturesForRound(
  env: Env,
  roundId: string,
): Promise<PickWithFixture[]> {
  const { results } = await env.DB.prepare(
    `SELECT picks.id, picks.game_entry_id, picks.team_id, picks.result,
            fixtures.status as fixture_status, fixtures.home_team_id, fixtures.away_team_id,
            fixtures.home_score, fixtures.away_score
     FROM picks
     JOIN fixtures ON fixtures.id = picks.fixture_id
     WHERE picks.round_id = ?`,
  )
    .bind(roundId)
    .all<PickWithFixture>();
  return results;
}

export async function setPickResult(
  env: Env,
  pickId: string,
  result: "win" | "loss" | "draw" | "void",
): Promise<void> {
  await env.DB.prepare("UPDATE picks SET result = ? WHERE id = ?").bind(result, pickId).run();
}

/** Applies a life loss (or elimination if no lives remain) to an entry. Returns true if eliminated. */
export async function applySetback(
  env: Env,
  entry: ActiveEntry,
  roundId: string,
): Promise<boolean> {
  if (entry.lives_remaining > 0) {
    await env.DB.prepare(
      "UPDATE game_entries SET lives_remaining = lives_remaining - 1 WHERE id = ?",
    )
      .bind(entry.id)
      .run();
    return false;
  }

  await env.DB.prepare(
    "UPDATE game_entries SET status = 'eliminated', eliminated_at_round_id = ? WHERE id = ?",
  )
    .bind(roundId, entry.id)
    .run();
  return true;
}

export interface UserContact {
  name: string;
  email: string;
}

export async function getUserContactById(env: Env, userId: string): Promise<UserContact | null> {
  const row = await env.DB.prepare("SELECT name, email FROM users WHERE id = ?")
    .bind(userId)
    .first<UserContact>();
  return row ?? null;
}

export async function getEntryUserContact(env: Env, entryId: string): Promise<UserContact | null> {
  const row = await env.DB.prepare(
    `SELECT users.name, users.email FROM game_entries
     JOIN users ON users.id = game_entries.user_id
     WHERE game_entries.id = ?`,
  )
    .bind(entryId)
    .first<UserContact>();
  return row ?? null;
}

export async function markWinners(env: Env, gameId: string, entryIds: string[]): Promise<void> {
  if (entryIds.length === 0) return;
  const placeholders = entryIds.map(() => "?").join(",");
  await env.DB.prepare(
    `UPDATE game_entries SET status = 'winner' WHERE id IN (${placeholders})`,
  )
    .bind(...entryIds)
    .run();
  await env.DB.prepare("UPDATE games SET status = 'completed' WHERE id = ?").bind(gameId).run();
}
