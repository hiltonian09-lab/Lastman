import { getPlatformStats } from "@/lib/db/platform";
import { listFeedback } from "@/lib/db/feedback";

function formatCents(cents: number): string {
  return `£${(cents / 100).toFixed(2)}`;
}

export default async function OwnerOverviewPage() {
  const [stats, feedback] = await Promise.all([getPlatformStats(), listFeedback(10)]);
  const totalRevenue = stats.minimumFeeRevenueCents + stats.balanceFeeRevenueCents;

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="glass-card p-4">
          <p className="text-xs uppercase tracking-wide text-foreground-muted">
            Total admin fees
          </p>
          <p className="font-[family-name:var(--font-heading)] mt-1 text-2xl font-semibold text-gold">
            {formatCents(totalRevenue)}
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs uppercase tracking-wide text-foreground-muted">Active games</p>
          <p className="font-[family-name:var(--font-heading)] mt-1 text-2xl font-semibold">
            {stats.activeGames}
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs uppercase tracking-wide text-foreground-muted">Total users</p>
          <p className="font-[family-name:var(--font-heading)] mt-1 text-2xl font-semibold">
            {stats.totalUsers}
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs uppercase tracking-wide text-foreground-muted">
            Minimum-fee revenue
          </p>
          <p className="mt-1 text-lg font-medium">{formatCents(stats.minimumFeeRevenueCents)}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs uppercase tracking-wide text-foreground-muted">
            Balance-fee revenue
          </p>
          <p className="mt-1 text-lg font-medium">{formatCents(stats.balanceFeeRevenueCents)}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs uppercase tracking-wide text-foreground-muted">Blocked games</p>
          <p
            className={`mt-1 text-lg font-medium ${stats.gamesBlocked > 0 ? "text-status-pending" : ""}`}
          >
            {stats.gamesBlocked}
          </p>
        </div>
      </div>

      <section className="mt-10">
        <h2 className="font-[family-name:var(--font-heading)] text-lg font-medium">
          Recent feedback
        </h2>
        <div className="mt-3 flex flex-col gap-2">
          {feedback.length === 0 && (
            <p className="text-sm text-foreground-muted">No feedback yet.</p>
          )}
          {feedback.map((f) => (
            <div key={f.id} className="glass-card p-3 text-sm">
              <p>{f.message}</p>
              <p className="mt-1 text-xs text-foreground-muted">
                {f.user_name} ({f.user_email}) ·{" "}
                {new Date(f.created_at).toLocaleString("en-GB")}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
