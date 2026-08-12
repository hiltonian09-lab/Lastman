import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/client";
import { reconcileMinimumFeeSession } from "@/lib/stripe/admin-fee-checkout";
import { getEnv } from "@/lib/cloudflare";

export async function POST(request: Request) {
  const env = await getEnv();
  const stripe = await getStripe();
  const signature = request.headers.get("stripe-signature");
  const body = await request.text();

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${(err as Error).message}` },
      { status: 400 },
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as { id: string };
    await reconcileMinimumFeeSession(session.id);
  }

  return NextResponse.json({ received: true });
}
