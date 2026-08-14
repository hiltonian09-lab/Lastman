"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getGameBySlug } from "@/lib/db/games";
import { getGameEntry, submitPick } from "@/lib/db/picks";
import { ensureCurrentRound } from "@/lib/db/rounds";

export interface PickFormState {
  error?: string;
}

export async function submitPickAction(
  slug: string,
  _prevState: PickFormState,
  formData: FormData,
): Promise<PickFormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const game = await getGameBySlug(slug);
  if (!game) return { error: "Game not found." };
  if (game.status === "blocked") {
    return { error: "This game is temporarily unavailable." };
  }

  const entry = await getGameEntry(game.id, user.id);
  if (!entry) return { error: "You're not in this game." };
  if (entry.status !== "active") {
    return { error: "You've already been eliminated from this game." };
  }

  const fixtureId = String(formData.get("fixtureId") ?? "");
  const teamId = String(formData.get("teamId") ?? "");
  if (!fixtureId || !teamId) return { error: "Pick a team first." };

  const round = await ensureCurrentRound(game);

  const result = await submitPick({
    gameEntryId: entry.id,
    roundId: round.id,
    fixtureId,
    teamId,
    deadlineAt: round.lock_at,
  });

  if (!result.ok) return { error: result.error };

  revalidatePath(`/games/${slug}`);
  return {};
}
