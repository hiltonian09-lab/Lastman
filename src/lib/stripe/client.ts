import "server-only";
import Stripe from "stripe";
import { getEnv } from "@/lib/cloudflare";

export async function getStripe(): Promise<Stripe> {
  const env = await getEnv();
  return new Stripe(env.STRIPE_SECRET_KEY, {
    httpClient: Stripe.createFetchHttpClient(),
  });
}
