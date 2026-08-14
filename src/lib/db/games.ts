import { getEnv } from "@/lib/cloudflare";

export interface GameRules {
  lives: number; // 0-3, default 0
  missedPickPolicy: "lowest_alphabetical" | "eliminate";
  tiebreaker: "split" | "total_goals";
}

export const DEFAULT_RULES: GameRules = {
  lives: 0,
  missedPickPolicy: "lowest_alphabetical",
  tiebreaker: "split",
};

export interface GameRow {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  type: "private" | "platform_official";
  league_ids: string; // JSON array
  rules_json: string; // JSON GameRules
  display_entry_fee_cents: number | null;
  display_prize_pool_note: string | null;
  prize_fund_percent: number | null;
  prize_places: number | null;
  prize_splits_json: string | null;
  booby_prize_percent: number | null;
  currency: string;
  max_players: number | null;
  status: "draft" | "open" | "locked" | "in_progress" | "blocked" | "completed" | "cancelled";
  blocked_reason: string | null;
  invite_code: string | null;
  visibility: "public" | "invite_only";
  starts_at: string | null;
  created_at: string;
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "game"
  );
}

function generateInviteCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I ambiguity
  let code = "";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  for (const b of bytes) code += alphabet[b % alphabet.length];
  return `LMS-${code}`;
}

export interface CreateGameParams {
  ownerId: string;
  name: string;
  leagueIds: string[];
  maxPlayers: number | null;
  rules: GameRules;
  displayEntryFeeCents: number | null;
  displayPrizePoolNote: string | null;
  visibility: "public" | "invite_only";
  startsAt: string | null;
  prizeFundPercent: number | null;
  prizePlaces: number | null;
  prizeSplits: number[] | null;
  boobyPrizePercent: number | null;
}

export async function createGame(params: CreateGameParams): Promise<GameRow> {
  const env = await getEnv();
  const id = crypto.randomUUID();

  const baseSlug = slugify(params.name);
  let slug = baseSlug;
  let attempt = 0;
  // Ensure slug uniqueness without unbounded retries
  while (attempt < 5) {
    const existing = await env.DB.prepare("SELECT id FROM games WHERE slug = ?")
      .bind(slug)
      .first();
    if (!existing) break;
    attempt++;
    slug = `${baseSlug}-${crypto.randomUUID().slice(0, 4)}`;
  }

  const inviteCode = generateInviteCode();

  await env.DB.prepare(
    `INSERT INTO games
      (id, name, slug, owner_id, type, league_ids, rules_json, display_entry_fee_cents,
       display_prize_pool_note, currency, max_players, status, invite_code, visibility, starts_at,
       prize_fund_percent, prize_places, prize_splits_json, booby_prize_percent)
     VALUES (?, ?, ?, ?, 'private', ?, ?, ?, ?, 'GBP', ?, 'draft', ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      params.name.trim(),
      slug,
      params.ownerId,
      JSON.stringify(params.leagueIds),
      JSON.stringify(params.rules),
      params.displayEntryFeeCents,
      params.displayPrizePoolNote,
      params.maxPlayers,
      inviteCode,
      params.visibility,
      params.startsAt,
      params.prizeFundPercent,
      params.prizePlaces,
      params.prizeSplits ? JSON.stringify(params.prizeSplits) : null,
      params.boobyPrizePercent,
    )
    .run();

  const game = await getGameById(id);
  if (!game) throw new Error("Failed to create game");
  return game;
}

export interface CreateOfficialGameParams {
  ownerId: string;
  name: string;
  leagueIds: string[];
  maxPlayers: number | null;
  rules: GameRules;
  startsAt: string | null;
}

/**
 * Platform-official games (PLAN.md §8): created by the Platform Owner,
 * visible to everyone, and exempt from the admin fee entirely — they open
 * immediately with no Stripe step and no `admin_fee_charges` row.
 */
export async function createOfficialGame(params: CreateOfficialGameParams): Promise<GameRow> {
  const env = await getEnv();
  const id = crypto.randomUUID();

  const baseSlug = slugify(params.name);
  let slug = baseSlug;
  let attempt = 0;
  while (attempt < 5) {
    const existing = await env.DB.prepare("SELECT id FROM games WHERE slug = ?")
      .bind(slug)
      .first();
    if (!existing) break;
    attempt++;
    slug = `${baseSlug}-${crypto.randomUUID().slice(0, 4)}`;
  }

  const inviteCode = generateInviteCode();

  await env.DB.prepare(
    `INSERT INTO games
      (id, name, slug, owner_id, type, league_ids, rules_json, currency, max_players,
       status, invite_code, visibility, starts_at)
     VALUES (?, ?, ?, ?, 'platform_official', ?, ?, 'GBP', ?, 'open', ?, 'public', ?)`,
  )
    .bind(
      id,
      params.name.trim(),
      slug,
      params.ownerId,
      JSON.stringify(params.leagueIds),
      JSON.stringify(params.rules),
      params.maxPlayers,
      inviteCode,
      params.startsAt,
    )
    .run();

  const game = await getGameById(id);
  if (!game) throw new Error("Failed to create official game");
  return game;
}

export async function getGameById(id: string, env?: Env): Promise<GameRow | null> {
  const e = env ?? (await getEnv());
  const row = await e.DB.prepare("SELECT * FROM games WHERE id = ?").bind(id).first<GameRow>();
  return row ?? null;
}

export async function getGameBySlug(slug: string): Promise<GameRow | null> {
  const env = await getEnv();
  const row = await env.DB.prepare("SELECT * FROM games WHERE slug = ?")
    .bind(slug)
    .first<GameRow>();
  return row ?? null;
}

export async function getGameByInviteCode(code: string): Promise<GameRow | null> {
  const env = await getEnv();
  const row = await env.DB.prepare("SELECT * FROM games WHERE invite_code = ?")
    .bind(code.trim().toUpperCase())
    .first<GameRow>();
  return row ?? null;
}

export async function listGamesOwnedBy(ownerId: string): Promise<GameRow[]> {
  const env = await getEnv();
  const { results } = await env.DB.prepare(
    "SELECT * FROM games WHERE owner_id = ? ORDER BY created_at DESC",
  )
    .bind(ownerId)
    .all<GameRow>();
  return results;
}

export async function listPublicOpenGames(): Promise<GameRow[]> {
  const env = await getEnv();
  const { results } = await env.DB.prepare(
    `SELECT * FROM games WHERE visibility = 'public' AND status IN ('open', 'in_progress')
     ORDER BY created_at DESC LIMIT 50`,
  ).all<GameRow>();
  return results;
}

export async function listGamesWithStatus(
  statuses: GameRow["status"][],
  env?: Env,
): Promise<GameRow[]> {
  const e = env ?? (await getEnv());
  const placeholders = statuses.map(() => "?").join(",");
  const { results } = await e.DB.prepare(
    `SELECT * FROM games WHERE status IN (${placeholders})`,
  )
    .bind(...statuses)
    .all<GameRow>();
  return results;
}

/** True once any round has locked — leagues/rules shouldn't change mid-game. */
export async function hasGameStarted(gameId: string): Promise<boolean> {
  const env = await getEnv();
  const row = await env.DB.prepare(
    "SELECT id FROM rounds WHERE game_id = ? AND status != 'upcoming' LIMIT 1",
  )
    .bind(gameId)
    .first();
  return !!row;
}

export interface UpdateGameSettingsParams {
  name?: string;
  leagueIds?: string[];
  maxPlayers?: number | null;
  missedPickPolicy?: GameRules["missedPickPolicy"];
  displayEntryFeeCents?: number | null;
  displayPrizePoolNote?: string | null;
  visibility?: "public" | "invite_only";
  startsAt?: string | null;
  prizeFundPercent?: number | null;
  prizePlaces?: number | null;
  prizeSplits?: number[] | null;
  boobyPrizePercent?: number | null;
}

export async function updateGameSettings(
  gameId: string,
  params: UpdateGameSettingsParams,
): Promise<void> {
  const env = await getEnv();
  const game = await getGameById(gameId);
  if (!game) throw new Error("Game not found");

  const rules = JSON.parse(game.rules_json) as GameRules;
  if (params.missedPickPolicy) rules.missedPickPolicy = params.missedPickPolicy;

  await env.DB.prepare(
    `UPDATE games SET
       name = ?, league_ids = ?, rules_json = ?, max_players = ?,
       display_entry_fee_cents = ?, display_prize_pool_note = ?, visibility = ?, starts_at = ?,
       prize_fund_percent = ?, prize_places = ?, prize_splits_json = ?, booby_prize_percent = ?
     WHERE id = ?`,
  )
    .bind(
      params.name !== undefined ? params.name.trim() : game.name,
      JSON.stringify(params.leagueIds ?? JSON.parse(game.league_ids)),
      JSON.stringify(rules),
      params.maxPlayers !== undefined ? params.maxPlayers : game.max_players,
      params.displayEntryFeeCents !== undefined
        ? params.displayEntryFeeCents
        : game.display_entry_fee_cents,
      params.displayPrizePoolNote !== undefined
        ? params.displayPrizePoolNote
        : game.display_prize_pool_note,
      params.visibility ?? game.visibility,
      params.startsAt !== undefined ? params.startsAt : game.starts_at,
      params.prizeFundPercent !== undefined ? params.prizeFundPercent : game.prize_fund_percent,
      params.prizePlaces !== undefined ? params.prizePlaces : game.prize_places,
      params.prizeSplits !== undefined
        ? params.prizeSplits
          ? JSON.stringify(params.prizeSplits)
          : null
        : game.prize_splits_json,
      params.boobyPrizePercent !== undefined
        ? params.boobyPrizePercent
        : game.booby_prize_percent,
      gameId,
    )
    .run();
}

export async function setGameStatus(
  gameId: string,
  status: GameRow["status"],
  blockedReason: string | null,
  env?: Env,
): Promise<void> {
  const e = env ?? (await getEnv());
  await e.DB.prepare(
    `UPDATE games SET status = ?, blocked_reason = ?, blocked_at = CASE WHEN ? = 'blocked' THEN datetime('now') ELSE blocked_at END WHERE id = ?`,
  )
    .bind(status, blockedReason, status, gameId)
    .run();
}
