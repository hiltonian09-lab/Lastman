import "server-only";
import type Stripe from "stripe";
import { getStripe } from "./client";
import { getOrCreateStripeCustomer } from "./customer";
import { getOrigin } from "@/lib/http/origin";
import { markMinimumFeePaid } from "@/lib/db/admin-fee";
import type { GameRow } from "@/lib/db/games";
import type { SessionUser } from "@/lib/auth/session";

/**
 * Step 1 of the admin-fee model (PLAN.md §6): charge the £10 minimum fee now
 * and save the card (setup_future_usage: off_session) so the balance can be
 * charged automatically once round 1 locks and the final headcount is known.
 */
export async function createMinimumFeeCheckoutSession(params: {
  game: GameRow;
  user: SessionUser;
  minimumFeeCents: number;
}): Promise<string> {
  const stripe = await getStripe();
  const origin = await getOrigin();

  const customerId = await getOrCreateStripeCustomer({
    userId: params.user.id,
    email: params.user.email,
    name: params.user.name,
  });

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    line_items: [
      {
        price_data: {
          currency: "gbp",
          unit_amount: params.minimumFeeCents,
          product_data: {
            name: `The Gauntlet — admin fee for "${params.game.name}"`,
            description:
              "Minimum hosting fee (non-refundable). Covers up to 5 players; a balance is billed automatically once round 1 locks if more players join.",
          },
        },
        quantity: 1,
      },
    ],
    payment_intent_data: {
      setup_future_usage: "off_session",
      metadata: { game_id: params.game.id },
    },
    metadata: { game_id: params.game.id, kind: "admin_fee_minimum" },
    success_url: `${origin}/host/${params.game.slug}/paid?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/host/${params.game.slug}/setup`,
  });

  if (!session.url) throw new Error("Stripe did not return a Checkout URL");
  return session.url;
}

/**
 * Idempotent reconciliation shared by the Checkout success-page return and the
 * webhook handler — either path (or both) can call this safely.
 */
export async function reconcileMinimumFeeSession(sessionId: string): Promise<{
  gameId: string | null;
  paid: boolean;
}> {
  const stripe = await getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["payment_intent.payment_method"],
  });

  const gameId = session.metadata?.game_id ?? null;
  if (!gameId || session.metadata?.kind !== "admin_fee_minimum") {
    return { gameId, paid: false };
  }
  if (session.payment_status !== "paid") {
    return { gameId, paid: false };
  }

  const paymentIntent = session.payment_intent as Stripe.PaymentIntent;
  const paymentMethod = paymentIntent.payment_method as Stripe.PaymentMethod | string | null;

  await markMinimumFeePaid({
    gameId,
    paymentIntentId: paymentIntent.id,
    customerId: typeof session.customer === "string" ? session.customer : (session.customer?.id ?? ""),
    paymentMethodId:
      typeof paymentMethod === "string" ? paymentMethod : (paymentMethod?.id ?? null),
  });

  return { gameId, paid: true };
}
