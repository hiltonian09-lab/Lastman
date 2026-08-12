import "server-only";
import { getEnv } from "@/lib/cloudflare";

export interface PickRow {
  id: string;
  round_id: string;
  game_entry_id: string;
  fixture_id: string;
  team_id: string;
  result: "pending" | "win" | "loss" | "draw" | "void";
}

export async function getPickForRound(
  gameEntryId: string,
  roundId: string,
): Promise<PickRow | null> {
  const env = await getEnv();
  const row = await env.DB.prepare(
    "SELECT * FROM picks WHERE game_entry_id = ? AND round_id = ?",
  )
    .bind(gameEntryId, roundId)
    .first<PickRow>();
  return row ?? null;
}

export interface SubmitPickResult {
  ok: boolean;
  error?: string;
}

export async function submitPick(params: {
  gameEntryId: string;
  roundId: string;
  fixtureId: string;
  teamId: string;
  deadlineAt: string;
}): Promise<SubmitPickResult> {
  if (new Date(params.deadlineAt).getTime() < Date.now()) {
    return { ok: false, error: "The deadline for this round has passed." };
  }

  const env = await getEnv();

  const alreadyUsed = await env.DB.prepare(
    `SELECT id FROM picks WHERE game_entry_id = ? AND team_id = ? AND result != 'void'`,
  )
    .bind(params.gameEntryId, params.teamId)
    .first();
  if (alreadyUsed) {
    return { ok: false, error: "You've already picked this team in this game." };
  }

  const existingForRound = await getPickForRound(params.gameEntryId, params.roundId);

  if (existingForRound) {
    await env.DB.prepare(
      "UPDATE picks SET fixture_id = ?, team_id = ?, result = 'pending' WHERE id = ?",
    )
      .bind(params.fixtureId, params.teamId, existingForRound.id)
      .run();
  } else {
    await env.DB.prepare(
      `INSERT INTO picks (id, round_id, game_entry_id, fixture_id, team_id)
       VALUES (?, ?, ?, ?, ?)`,
    )
      .bind(crypto.randomUUID(), params.roundId, params.gameEntryId, params.fixtureId, params.teamId)
      .run();
  }

  return { ok: true };
}

export async function getGameEntry(
  gameId: string,
  userId: string,
): Promise<{ id: string; status: string; lives_remaining: number } | null> {
  const env = await getEnv();
  const row = await env.DB.prepare(
    "SELECT id, status, lives_remaining FROM game_entries WHERE game_id = ? AND user_id = ?",
  )
    .bind(gameId, userId)
    .first<{ id: string; status: string; lives_remaining: number }>();
  return row ?? null;
}
