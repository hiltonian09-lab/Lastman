import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { getGameBySlug } from "@/lib/db/games";
import { listEntriesForGame } from "@/lib/db/game-entries";
import { getAdminFeeChargeByGameId } from "@/lib/db/admin-fee";
import { listGameMessages } from "@/lib/db/messages";
import { getSyncStatus } from "@/lib/db/sync-status";
import { formatRelativeTime } from "@/lib/format/relative-time";
import { getOrigin } from "@/lib/http/origin";
import { BroadcastForm } from "./broadcast-form";
import { InviteLink } from "./invite-link";

export default async function GameDashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const game = await getGameBySlug(slug);
  if (!game) redirect("/dashboard");
  if (game.owner_id !== user.id) redirect(`/games/${slug}`);
  if (game.status === "draft") redirect(`/host/${slug}/setup`);

  const [entries, adminFee, messages, fixturesSync, origin] = await Promise.all([
    listEntriesForGame(game.id),
    getAdminFeeChargeByGameId(game.id),
    listGameMessages(game.id),
    getSyncStatus("live_scores"),
    getOrigin(),
  ]);

  const activeCount = entries.filter((e) => e.status === "active").length;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-16">
      {game.status === "blocked" && (
        <div className="glass-card mb-6 border-status-pending p-4 text-sm">
          <p className="font-medium text-status-pending">
            This game is blocked — your admin fee balance charge failed.
          </p>
          <p className="mt-1 text-foreground-muted">
            Players can&rsquo;t make picks until this is resolved. Update your
            payment method to restore access.
          </p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="font-[family-name:var(--font-heading)] text-3xl font-semibold">
          {game.name}
        </h1>
        <Link
          href={`/host/${slug}/settings`}
          className="rounded-full border border-border-glass px-4 py-2 text-sm hover:bg-surface-glass"
        >
          Settings
        </Link>
      </div>
      <p className="mt-1 text-sm text-foreground-muted">
        Status: {game.status} · {activeCount}/{entries.length} still in
      </p>
      {fixturesSync && (
        <p className="mt-1 text-xs text-foreground-muted">
          Fixtures updated {formatRelativeTime(fixturesSync.last_synced_at)}
        </p>
      )}

      <div className="mt-6">
        <InviteLink code={game.invite_code ?? ""} origin={origin} />
      </div>

      {adminFee && (
        <div className="glass-card mt-6 p-4 text-sm">
          <p className="text-foreground-muted">
            Admin fee: £{(adminFee.minimum_fee_cents / 100).toFixed(2)} minimum —{" "}
            <span className="text-status-alive">{adminFee.minimum_fee_status}</span>
            {adminFee.balance_cents !== null && (
              <>
                {" "}
                · Balance: £{(adminFee.balance_cents / 100).toFixed(2)} —{" "}
                {adminFee.balance_status}
              </>
            )}
          </p>
        </div>
      )}

      <section className="mt-8">
        <h2 className="font-[family-name:var(--font-heading)] text-lg font-medium">
          Entrants
        </h2>
        <div className="mt-3 flex flex-col gap-2">
          {entries.length === 0 && (
            <p className="text-sm text-foreground-muted">
              No one&rsquo;s joined yet — share your invite code.
            </p>
          )}
          {entries.map((e) => (
            <div
              key={e.id}
              className="glass-card flex items-center justify-between px-4 py-3 text-sm"
            >
              <span>{e.name}</span>
              <span
                className={
                  e.status === "active" ? "text-status-alive" : "text-status-eliminated"
                }
              >
                {e.status}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-[family-name:var(--font-heading)] text-lg font-medium">
          Message your league
        </h2>
        <div className="mt-3">
          <BroadcastForm slug={slug} />
        </div>
        {messages.length > 0 && (
          <div className="mt-4 flex flex-col gap-2">
            {messages.map((m) => (
              <div key={m.id} className="glass-card p-3 text-sm">
                <p>{m.body}</p>
                <p className="mt-1 text-xs text-foreground-muted">
                  {m.sender_name} · {new Date(m.sent_at).toLocaleString("en-GB")}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
