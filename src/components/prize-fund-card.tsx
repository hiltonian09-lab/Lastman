export function PrizeFundCard({
  entryFeeCents,
  prizePoolNote,
}: {
  entryFeeCents: number | null;
  prizePoolNote: string | null;
}) {
  if (entryFeeCents === null && !prizePoolNote) return null;

  return (
    <div className="glass-card p-4">
      <p className="text-xs uppercase tracking-wide text-gold">Prize fund</p>
      {entryFeeCents !== null && (
        <p className="font-[family-name:var(--font-heading)] mt-1 text-lg font-medium">
          Entry: £{(entryFeeCents / 100).toFixed(2)}
        </p>
      )}
      {prizePoolNote && <p className="mt-1 text-sm">{prizePoolNote}</p>}
      <p className="mt-2 text-xs text-foreground-muted">
        Arranged directly between the organiser and players — this platform
        never collects or holds this money.
      </p>
    </div>
  );
}
