import { getStripe } from "@/lib/stripe/client";
import { getActiveAdminFeeConfig, getAdminFeeChargeByGameId, recordBalanceOutcome } from "@/lib/db/admin-fee";
import { setGameStatus } from "@/lib/db/games";
import { countAllEntries } from "./queries";

/**
 * PLAN.md §6: once round 1 locks, charge the balance (headcount × per-player
 * rate, minus the £10 already paid) to the card saved at Checkout. A failed
 * charge blocks the whole game until the organiser resolves it.
 *
 * Note: this is a single attempt, not Stripe's full Smart Retries + webhook
 * retry queue — a real production hardening pass would want a delayed retry
 * before blocking, but for now one failed attempt blocks immediately.
 */
export async function chargeBalanceIfDue(env: Env, gameId: string): Promise<void> {
  const charge = await getAdminFeeChargeByGameId(gameId, env);
  if (!charge || charge.balance_status !== "not_due") return;

  const playerCount = await countAllEntries(env, gameId);
  const feeConfig = await getActiveAdminFeeConfig(env);
  const balanceCents = Math.max(
    0,
    playerCount * feeConfig.per_player_fee_cents - charge.minimum_fee_cents,
  );

  if (balanceCents === 0) {
    await recordBalanceOutcome(
      { gameId, playerCountAtLock: playerCount, balanceCents: 0, status: "paid", paymentIntentId: null },
      env,
    );
    return;
  }

  if (!charge.stripe_customer_id || !charge.stripe_payment_method_id) {
    // Shouldn't happen — the minimum-fee Checkout always saves a payment method — but guard anyway.
    await recordBalanceOutcome(
      { gameId, playerCountAtLock: playerCount, balanceCents, status: "failed", paymentIntentId: null },
      env,
    );
    await setGameStatus(gameId, "blocked", "admin_fee_balance_failed", env);
    return;
  }

  const stripe = await getStripe(env);

  try {
    const intent = await stripe.paymentIntents.create({
      amount: balanceCents,
      currency: feeConfig.currency.toLowerCase(),
      customer: charge.stripe_customer_id,
      payment_method: charge.stripe_payment_method_id,
      off_session: true,
      confirm: true,
      metadata: { game_id: gameId, kind: "admin_fee_balance" },
    });

    if (intent.status !== "succeeded") {
      throw new Error(`Unexpected PaymentIntent status: ${intent.status}`);
    }

    await recordBalanceOutcome(
      {
        gameId,
        playerCountAtLock: playerCount,
        balanceCents,
        status: "paid",
        paymentIntentId: intent.id,
      },
      env,
    );
  } catch {
    await recordBalanceOutcome(
      { gameId, playerCountAtLock: playerCount, balanceCents, status: "failed", paymentIntentId: null },
      env,
    );
    await setGameStatus(gameId, "blocked", "admin_fee_balance_failed", env);
  }
}
