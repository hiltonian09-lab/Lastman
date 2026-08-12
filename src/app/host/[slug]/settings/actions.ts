"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { getGameBySlug, hasGameStarted, updateGameSettings, type GameRules } from "@/lib/db/games";

export interface SettingsFormState {
  error?: string;
  success?: boolean;
}

export async function updateSettingsAction(
  slug: string,
  _prevState: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const game = await getGameBySlug(slug);
  if (!game || game.owner_id !== user.id) redirect("/dashboard");

  const started = await hasGameStarted(game.id);

  const leagueIds = formData.getAll("leagueIds").map(String);
  const maxPlayersRaw = String(formData.get("maxPlayers") ?? "").trim();
  const missedPickPolicy = String(
    formData.get("missedPickPolicy") ?? "lowest_alphabetical",
  ) as GameRules["missedPickPolicy"];
  const displayEntryFeeRaw = String(formData.get("displayEntryFee") ?? "").trim();
  const displayPrizePoolNote = String(formData.get("displayPrizePoolNote") ?? "").trim();
  const visibility = String(formData.get("visibility") ?? game.visibility) as
    | "public"
    | "invite_only";

  if (!started && leagueIds.length === 0) {
    return { error: "Select at least one league." };
  }

  const maxPlayers = maxPlayersRaw ? parseInt(maxPlayersRaw, 10) : null;
  if (maxPlayersRaw && (!Number.isInteger(maxPlayers) || (maxPlayers as number) < 2)) {
    return { error: "Max players must be a whole number of 2 or more." };
  }

  const displayEntryFeeCents = displayEntryFeeRaw
    ? Math.round(parseFloat(displayEntryFeeRaw) * 100)
    : null;
  if (displayEntryFeeRaw && (Number.isNaN(displayEntryFeeCents) || (displayEntryFeeCents as number) < 0)) {
    return { error: "Entry fee must be a valid amount." };
  }

  await updateGameSettings(game.id, {
    leagueIds: started ? undefined : leagueIds,
    maxPlayers,
    missedPickPolicy,
    displayEntryFeeCents,
    displayPrizePoolNote: displayPrizePoolNote || null,
    visibility: game.type === "platform_official" ? undefined : visibility,
  });

  revalidatePath(`/host/${slug}`);
  revalidatePath(`/host/${slug}/settings`);
  return { success: true };
}
