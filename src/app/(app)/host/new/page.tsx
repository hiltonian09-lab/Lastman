import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { listLeagues } from "@/lib/db/leagues";
import { getActiveAdminFeeConfig } from "@/lib/db/admin-fee";
import { HostForm } from "./host-form";

export default async function NewGamePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [leagues, feeConfig] = await Promise.all([
    listLeagues(),
    getActiveAdminFeeConfig(),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col px-6 py-16">
      <h1 className="font-[family-name:var(--font-heading)] text-3xl font-semibold">
        Host a game
      </h1>
      <p className="mt-2 text-sm text-foreground-muted">
        You&rsquo;ll pay a {(feeConfig.minimum_fee_cents / 100).toFixed(2)}{" "}
        {feeConfig.currency} minimum admin fee to open the game (non-refundable,
        covers up to{" "}
        {Math.floor(feeConfig.minimum_fee_cents / feeConfig.per_player_fee_cents)}{" "}
        players). If more players join, the balance —{" "}
        {(feeConfig.per_player_fee_cents / 100).toFixed(2)} {feeConfig.currency} per
        player beyond that — is charged automatically once round 1 locks. Entry
        fees and prize money are entirely between you and your players; the
        platform never touches that money.
      </p>

      <HostForm leagues={leagues} minimumFeeCents={feeConfig.minimum_fee_cents} />
    </div>
  );
}
