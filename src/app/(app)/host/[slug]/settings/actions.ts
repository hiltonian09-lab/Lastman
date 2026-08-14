"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { getGameBySlug, hasGameStarted, updateGameSettings, type GameRules } from "@/lib/db/games";
import { parsePrizeForm } from "@/lib/prize";
import { parseLogoUpload } from "@/lib/logo";

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
  const isOwnerOrPlatformOwner =
    !!game && (game.owner_id === user.id || user.role === "platform_owner");
  if (!game || !isOwnerOrPlatformOwner) redirect("/dashboard");

  const started = await hasGameStarted(game.id);

  const name = String(formData.get("name") ?? "").trim();
  const leagueId = String(formData.get("leagueId") ?? "").trim();
  const maxPlayersRaw = String(formData.get("maxPlayers") ?? "").trim();
  const missedPickPolicy = String(
    formData.get("missedPickPolicy") ?? "lowest_alphabetical",
  ) as GameRules["missedPickPolicy"];
  const displayEntryFeeRaw = String(formData.get("displayEntryFee") ?? "").trim();
  const visibility = String(formData.get("visibility") ?? game.visibility) as
    | "public"
    | "invite_only";
  const startsAtRaw = String(formData.get("startsAt") ?? "").trim();

  if (!name) return { error: "Give your game a name." };
  if (!started && !leagueId) {
    return { error: "Select a league." };
  }
  if (startsAtRaw && Number.isNaN(Date.parse(startsAtRaw))) {
    return { error: "Start date isn't valid." };
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

  const isOfficial = game.type === "platform_official";
  const prizeForm = isOfficial ? null : parsePrizeForm(formData);
  if (prizeForm && "error" in prizeForm) return { error: prizeForm.error };

  const logoResult = await parseLogoUpload(formData);
  if (!logoResult.ok) return { error: logoResult.error };

  await updateGameSettings(game.id, {
    name,
    leagueIds: started ? undefined : [leagueId],
    maxPlayers,
    missedPickPolicy,
    displayEntryFeeCents,
    displayPrizePoolNote: null,
    visibility: isOfficial ? undefined : visibility,
    startsAt: started
      ? undefined
      : startsAtRaw
        ? new Date(startsAtRaw).toISOString()
        : null,
    prizeFundPercent: prizeForm ? prizeForm.prizeFundPercent : undefined,
    prizePlaces: prizeForm ? prizeForm.prizePlaces : undefined,
    prizeSplits: prizeForm ? prizeForm.prizeSplits : undefined,
    boobyPrizePercent: prizeForm ? prizeForm.boobyPrizePercent : undefined,
    logoDataUrl: logoResult.dataUrl,
  });

  revalidatePath(`/host/${slug}`);
  revalidatePath(`/host/${slug}/settings`);
  return { success: true };
}
