import { getActiveAdminFeeConfig } from "@/lib/db/admin-fee";
import { PricingForm } from "./pricing-form";

export default async function OwnerPricingPage() {
  const config = await getActiveAdminFeeConfig();

  return (
    <div>
      <h1 className="font-[family-name:var(--font-heading)] text-2xl font-semibold">
        Admin-fee pricing
      </h1>
      <p className="mt-1 text-sm text-foreground-muted">
        Changing this creates a new pricing version — games already created
        keep the pricing they were created under, only new games use the
        updated rate.
      </p>

      <div className="glass-card mt-6 p-4 text-sm">
        Current: £{(config.minimum_fee_cents / 100).toFixed(2)} minimum + £
        {(config.per_player_fee_cents / 100).toFixed(2)} per player
      </div>

      <div className="mt-6">
        <PricingForm
          defaultMinimum={(config.minimum_fee_cents / 100).toFixed(2)}
          defaultPerPlayer={(config.per_player_fee_cents / 100).toFixed(2)}
        />
      </div>
    </div>
  );
}
