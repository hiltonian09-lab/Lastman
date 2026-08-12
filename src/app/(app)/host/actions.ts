"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { createGame, getGameBySlug, type GameRules } from "@/lib/db/games";
import { createPendingAdminFeeCharge, getActiveAdminFeeConfig } from "@/lib/db/admin-fee";
import { createMinimumFeeCheckoutSession } from "@/lib/stripe/admin-fee-checkout";
import { sendGameMessage } from "@/lib/db/messages";
import { revalidatePath } from "next/cache";

export interface HostFormState {
  error?: string;
}

export async function createGameAction(
  _prevState: HostFormState,
  formData: FormData,
): Promise<HostFormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  const leagueIds = formData.getAll("leagueIds").map(String);
  const maxPlayersRaw = String(formData.get("maxPlayers") ?? "").trim();
  const lives = Number(formData.get("lives") ?? 0);
  const missedPickPolicy = String(
    formData.get("missedPickPolicy") ?? "lowest_alphabetical",
  ) as GameRules["missedPickPolicy"];
  const tiebreaker = String(formData.get("tiebreaker") ?? "split") as GameRules["tiebreaker"];
  const displayEntryFeeRaw = String(formData.get("displayEntryFee") ?? "").trim();
  const displayPrizePoolNote = String(formData.get("displayPrizePoolNote") ?? "").trim();
  const visibility = String(formData.get("visibility") ?? "invite_only") as
    | "public"
    | "invite_only";

  if (!name) return { error: "Give your game a name." };
  if (leagueIds.length === 0) return { error: "Select at least one league." };
  if (![0, 1, 2, 3].includes(lives)) return { error: "Lives must be between 0 and 3." };

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

  const rules: GameRules = { lives, missedPickPolicy, tiebreaker };

  const game = await createGame({
    ownerId: user.id,
    name,
    leagueIds,
    maxPlayers,
    rules,
    displayEntryFeeCents,
    displayPrizePoolNote: displayPrizePoolNote || null,
    visibility,
  });

  const feeConfig = await getActiveAdminFeeConfig();
  await createPendingAdminFeeCharge({
    gameId: game.id,
    ownerId: user.id,
    minimumFeeCents: feeConfig.minimum_fee_cents,
  });

  const checkoutUrl = await createMinimumFeeCheckoutSession({
    game,
    user,
    minimumFeeCents: feeConfig.minimum_fee_cents,
  });

  redirect(checkoutUrl);
}

export interface BroadcastFormState {
  error?: string;
  success?: boolean;
}

export async function sendBroadcastAction(
  slug: string,
  _prevState: BroadcastFormState,
  formData: FormData,
): Promise<BroadcastFormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const game = await getGameBySlug(slug);
  const isOwnerOrPlatformOwner =
    !!game && (game.owner_id === user.id || user.role === "platform_owner");
  if (!game || !isOwnerOrPlatformOwner) redirect("/dashboard");

  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { error: "Write a message first." };
  if (body.length > 1000) return { error: "Keep it under 1000 characters." };

  await sendGameMessage({ gameId: game.id, senderId: user.id, body });
  revalidatePath(`/host/${slug}`);
  return { success: true };
}

export async function retryAdminFeePaymentAction(slug: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const game = await getGameBySlug(slug);
  if (!game || game.owner_id !== user.id) redirect("/dashboard");
  if (game.status !== "draft") redirect(`/host/${slug}`);

  const feeConfig = await getActiveAdminFeeConfig();
  const checkoutUrl = await createMinimumFeeCheckoutSession({
    game,
    user,
    minimumFeeCents: feeConfig.minimum_fee_cents,
  });

  redirect(checkoutUrl);
}
