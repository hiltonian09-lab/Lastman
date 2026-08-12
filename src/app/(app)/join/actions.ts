"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getGameByInviteCode, getGameBySlug } from "@/lib/db/games";
import { joinGame } from "@/lib/db/game-entries";

export interface JoinFormState {
  error?: string;
}

export async function joinByCodeAction(
  _prevState: JoinFormState,
  formData: FormData,
): Promise<JoinFormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const code = String(formData.get("code") ?? "").trim();
  if (!code) return { error: "Enter an invite code." };

  const game = await getGameByInviteCode(code);
  if (!game) return { error: "No game found with that code." };

  const result = await joinGame(user.id, game);
  if (!result.ok) return { error: result.error };

  redirect(`/games/${game.slug}`);
}

export async function joinPublicGameAction(slug: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const game = await getGameBySlug(slug);
  if (!game) redirect("/games");

  await joinGame(user.id, game);
  redirect(`/games/${game.slug}`);
}
