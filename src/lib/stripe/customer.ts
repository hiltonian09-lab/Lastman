import "server-only";
import { getStripe } from "./client";
import { getEnv } from "@/lib/cloudflare";

export async function getOrCreateStripeCustomer(params: {
  userId: string;
  email: string;
  name: string;
}): Promise<string> {
  const env = await getEnv();

  const existing = await env.DB.prepare(
    "SELECT stripe_customer_id FROM users WHERE id = ?",
  )
    .bind(params.userId)
    .first<{ stripe_customer_id: string | null }>();

  if (existing?.stripe_customer_id) return existing.stripe_customer_id;

  const stripe = await getStripe();
  const customer = await stripe.customers.create({
    email: params.email,
    name: params.name,
    metadata: { app_user_id: params.userId },
  });

  await env.DB.prepare("UPDATE users SET stripe_customer_id = ? WHERE id = ?")
    .bind(customer.id, params.userId)
    .run();

  return customer.id;
}
