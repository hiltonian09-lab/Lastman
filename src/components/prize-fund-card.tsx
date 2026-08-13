import { calculatePrizeBreakdown, DEFAULT_PRIZE_CONFIG, type PrizeConfig } from "@/lib/prize";

const PLACE_LABELS = ["1st place", "2nd place", "3rd place"];

function formatCents(cents: number): string {
  return `£${(cents / 100).toFixed(2)}`;
}

export function PrizeFundCard({
  entryFeeCents,
  playerCount,
  prizeFundPercent,
  splitPercents,
  boobyPercent,
}: {
  entryFeeCents: number | null;
  playerCount: number;
  prizeFundPercent: number | null;
  splitPercents: number[] | null;
  boobyPercent: number | null;
}) {
  if (entryFeeCents === null) return null;

  const config: PrizeConfig = {
    entryFeeCents,
    prizeFundPercent: prizeFundPercent ?? DEFAULT_PRIZE_CONFIG.prizeFundPercent,
    splitPercents: splitPercents ?? DEFAULT_PRIZE_CONFIG.splitPercents,
    boobyPercent: boobyPercent ?? DEFAULT_PRIZE_CONFIG.boobyPercent,
  };
  const breakdown = calculatePrizeBreakdown(config, playerCount);

  return (
    <div className="glass-card p-4">
      <p className="text-xs uppercase tracking-wide text-gold">Prize fund</p>
      <p className="font-[family-name:var(--font-heading)] mt-1 text-lg font-medium">
        Entry: {formatCents(entryFeeCents)} · Prize pot: {formatCents(breakdown.prizeFundCents)}
      </p>
      <div className="mt-2 flex flex-col gap-1 text-sm">
        {config.splitPercents.map((pct, i) => (
          <p key={i}>
            {PLACE_LABELS[i] ?? `Place ${i + 1}`}: {formatCents(breakdown.placePayoutsCents[i])} ({pct}%)
          </p>
        ))}
        {config.boobyPercent > 0 && (
          <p>
            Booby prize: {formatCents(breakdown.boobyPrizeCents)} ({config.boobyPercent}%)
          </p>
        )}
      </div>
      <p className="mt-2 text-xs text-foreground-muted">
        Based on {playerCount} player{playerCount === 1 ? "" : "s"} right now — arranged
        directly between the organiser and players, the platform never collects or
        holds this money.
      </p>
    </div>
  );
}
