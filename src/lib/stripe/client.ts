import Stripe from "stripe";
import { getEnv } from "@/lib/cloudflare";

export async function getStripe(env?: Env): Promise<Stripe> {
  const e = env ?? (await getEnv());
  return new Stripe(e.STRIPE_SECRET_KEY, {
    httpClient: Stripe.createFetchHttpClient(),
  });
}
