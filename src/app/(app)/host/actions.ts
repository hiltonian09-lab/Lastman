"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { createGame, getGameBySlug, restartGame, type GameRules } from "@/lib/db/games";
import { createPendingAdminFeeCharge, getActiveAdminFeeConfig } from "@/lib/db/admin-fee";
import { createMinimumFeeCheckoutSession } from "@/lib/stripe/admin-fee-checkout";
import { sendGameMessage } from "@/lib/db/messages";
import { checkRateLimit } from "@/lib/rate-limit";
import { parsePrizeForm } from "@/lib/prize";
import { sendEmail } from "@/lib/email/resend";
import { inviteEmail } from "@/lib/email/templates";
import { getOrigin } from "@/lib/http/origin";
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

  const limit = await checkRateLimit("create_game", 5, 60);
  if (!limit.ok) return { error: "Too many attempts. Please try again in a minute." };

  const name = String(formData.get("name") ?? "").trim();
  const leagueId = String(formData.get("leagueId") ?? "").trim();
  const maxPlayersRaw = String(formData.get("maxPlayers") ?? "").trim();
  const lives = Number(formData.get("lives") ?? 0);
  const missedPickPolicy = String(
    formData.get("missedPickPolicy") ?? "lowest_alphabetical",
  ) as GameRules["missedPickPolicy"];
  const tiebreaker = String(formData.get("tiebreaker") ?? "split") as GameRules["tiebreaker"];
  const displayEntryFeeRaw = String(formData.get("displayEntryFee") ?? "").trim();
  const visibility = String(formData.get("visibility") ?? "invite_only") as
    | "public"
    | "invite_only";
  const startsAtRaw = String(formData.get("startsAt") ?? "").trim();
  const pickLockHoursBefore = Number(formData.get("pickLockHoursBefore") ?? 1);

  if (!name) return { error: "Give your game a name." };
  if (!leagueId) return { error: "Select a league." };
  if (![0, 1, 2, 3].includes(lives)) return { error: "Lives must be between 0 and 3." };
  if (![12, 9, 6, 3, 1].includes(pickLockHoursBefore)) {
    return { error: "Invalid pick lock time." };
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

  const prizeForm = parsePrizeForm(formData);
  if ("error" in prizeForm) return { error: prizeForm.error };

  const rules: GameRules = { lives, missedPickPolicy, tiebreaker };

  const game = await createGame({
    ownerId: user.id,
    name,
    leagueIds: [leagueId],
    maxPlayers,
    rules,
    displayEntryFeeCents,
    displayPrizePoolNote: null,
    visibility,
    startsAt: startsAtRaw ? new Date(startsAtRaw).toISOString() : null,
    prizeFundPercent: prizeForm.prizeFundPercent,
    prizePlaces: prizeForm.prizePlaces,
    prizeSplits: prizeForm.prizeSplits,
    boobyPrizePercent: prizeForm.boobyPrizePercent,
    pickLockHoursBefore,
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

export async function restartGameAction(slug: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const game = await getGameBySlug(slug);
  const isOwnerOrPlatformOwner =
    !!game && (game.owner_id === user.id || user.role === "platform_owner");
  if (!game || !isOwnerOrPlatformOwner) redirect("/dashboard");
  if (game.status !== "completed") redirect(`/host/${slug}`);

  await restartGame(game.id);
  revalidatePath(`/host/${slug}`);
  revalidatePath(`/games/${slug}`);
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

export interface InviteEmailFormState {
  error?: string;
  success?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_INVITES_PER_SEND = 30;

export async function sendInviteEmailsAction(
  slug: string,
  _prevState: InviteEmailFormState,
  formData: FormData,
): Promise<InviteEmailFormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const game = await getGameBySlug(slug);
  const isOwnerOrPlatformOwner =
    !!game && (game.owner_id === user.id || user.role === "platform_owner");
  if (!game || !isOwnerOrPlatformOwner) redirect("/dashboard");
  if (!game.invite_code) return { error: "This game doesn't have an invite code." };

  const limit = await checkRateLimit("send_invites", 5, 60);
  if (!limit.ok) return { error: "Too many attempts. Please try again in a minute." };

  const raw = String(formData.get("emails") ?? "");
  const emails = Array.from(
    new Set(
      raw
        .split(/[\n,]/)
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean),
    ),
  );

  if (emails.length === 0) return { error: "Enter at least one email address." };
  if (emails.length > MAX_INVITES_PER_SEND) {
    return { error: `Send at most ${MAX_INVITES_PER_SEND} invites at a time.` };
  }
  const invalid = emails.filter((e) => !EMAIL_RE.test(e));
  if (invalid.length > 0) {
    return { error: `Not a valid email: ${invalid[0]}` };
  }

  const origin = await getOrigin();
  const joinUrl = `${origin}/join?code=${game.invite_code}`;
  const email = inviteEmail({
    gameName: game.name,
    inviterName: user.name,
    joinUrl,
    inviteCode: game.invite_code,
  });

  await Promise.all(
    emails.map((to) => sendEmail({ to, subject: email.subject, html: email.html }, undefined)),
  );

  return { success: `Invite${emails.length > 1 ? "s" : ""} sent to ${emails.length} email${emails.length > 1 ? "s" : ""}.` };
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
