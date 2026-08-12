"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getEnv } from "@/lib/cloudflare";

export interface PricingFormState {
  error?: string;
  success?: boolean;
}

export async function updatePricingAction(
  _prevState: PricingFormState,
  formData: FormData,
): Promise<PricingFormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "platform_owner") redirect("/dashboard");

  const minimumFeePounds = parseFloat(String(formData.get("minimumFee") ?? ""));
  const perPlayerFeePounds = parseFloat(String(formData.get("perPlayerFee") ?? ""));

  if (!Number.isFinite(minimumFeePounds) || minimumFeePounds < 0) {
    return { error: "Enter a valid minimum fee." };
  }
  if (!Number.isFinite(perPlayerFeePounds) || perPlayerFeePounds < 0) {
    return { error: "Enter a valid per-player fee." };
  }

  const env = await getEnv();
  await env.DB.prepare(
    `INSERT INTO admin_fee_config (id, minimum_fee_cents, per_player_fee_cents, currency)
     VALUES (?, ?, ?, 'GBP')`,
  )
    .bind(
      crypto.randomUUID(),
      Math.round(minimumFeePounds * 100),
      Math.round(perPlayerFeePounds * 100),
    )
    .run();

  return { success: true };
}
