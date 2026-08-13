import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { getGameBySlug } from "@/lib/db/games";
import { listEntriesForGame } from "@/lib/db/game-entries";
import { getAdminFeeChargeByGameId, getActiveAdminFeeConfig } from "@/lib/db/admin-fee";
import { listGameMessages } from "@/lib/db/messages";
import { getSyncStatus } from "@/lib/db/sync-status";
import { getRoundsWithStats, getEntriesWithoutPickForRound } from "@/lib/db/round-stats";
import { getGameTrend, getGameSurvivalStats } from "@/lib/db/stats";
import { getLeaguesByIds } from "@/lib/db/leagues";
import { getUpcomingFixturesPreview } from "@/lib/db/game-fixtures-preview";
import { formatRelativeTime } from "@/lib/format/relative-time";
import { getOrigin } from "@/lib/http/origin";
import {
  calculatePrizeBreakdown,
  calculateNetProfitCents,
  calculatePlatformCostCents,
  parsePrizeSplits,
  DEFAULT_PRIZE_CONFIG,
} from "@/lib/prize";
import { PrizeFundCard } from "@/components/prize-fund-card";
import { LeagueInfoCard } from "@/components/league-info-card";
import { EmptyState } from "@/components/empty-state";
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
  const isOwnerOrPlatformOwner = game.owner_id === user.id || user.role === "platform_owner";
  if (!isOwnerOrPlatformOwner) redirect(`/games/${slug}`);
  if (game.status === "draft") redirect(`/host/${slug}/setup`);

  const [entries, adminFee, messages, fixturesSync, origin, rounds, trend, survival, feeConfig] =
    await Promise.all([
      listEntriesForGame(game.id),
      getAdminFeeChargeByGameId(game.id),
      listGameMessages(game.id),
      getSyncStatus("live_scores"),
      getOrigin(),
      getRoundsWithStats(game.id),
      getGameTrend(game.id),
      getGameSurvivalStats(game.id),
      getActiveAdminFeeConfig(),
    ]);

  const activeCount = entries.filter((e) => e.status === "active").length;
  const isOfficial = game.type === "platform_official";
  const prizeConfig = {
    entryFeeCents: game.display_entry_fee_cents ?? DEFAULT_PRIZE_CONFIG.entryFeeCents,
    prizeFundPercent: game.prize_fund_percent ?? DEFAULT_PRIZE_CONFIG.prizeFundPercent,
    splitPercents: parsePrizeSplits(game.prize_splits_json) ?? DEFAULT_PRIZE_CONFIG.splitPercents,
    boobyPercent: game.booby_prize_percent ?? DEFAULT_PRIZE_CONFIG.boobyPercent,
  };
  const prizeBreakdown = calculatePrizeBreakdown(prizeConfig, entries.length);
  const platformCostCents = calculatePlatformCostCents(entries.length, feeConfig);
  const netProfitCents = calculateNetProfitCents(
    prizeBreakdown.grossProfitCents,
    entries.length,
    feeConfig,
  );
  const currentRound = rounds.find((r) => r.status !== "resolved");
  const missingPicks = currentRound
    ? await getEntriesWithoutPickForRound(game.id, currentRound.id)
    : [];

  const leagueIds: string[] = JSON.parse(game.league_ids);
  const [leagues, upcomingFixtures] = await Promise.all([
    getLeaguesByIds(leagueIds),
    getUpcomingFixturesPreview(leagueIds),
  ]);

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

      <div className="mt-6 flex flex-col gap-4">
        <InviteLink code={game.invite_code ?? ""} origin={origin} />
        <LeagueInfoCard leagues={leagues} upcomingFixtures={upcomingFixtures} />
        <PrizeFundCard
          entryFeeCents={game.display_entry_fee_cents}
          playerCount={entries.length}
          prizeFundPercent={game.prize_fund_percent}
          splitPercents={parsePrizeSplits(game.prize_splits_json)}
          boobyPercent={game.booby_prize_percent}
        />
      </div>

      {!isOfficial && game.display_entry_fee_cents !== null && (
        <section className="mt-6">
          <div className="glass-card border-gold/30 p-4">
            <p className="text-xs uppercase tracking-wide text-gold">
              Your profit calculator — only you can see this
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              <div>
                <p className="text-foreground-muted">Total fund</p>
                <p className="font-medium">£{(prizeBreakdown.totalFundCents / 100).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-foreground-muted">Prize fund</p>
                <p className="font-medium">£{(prizeBreakdown.prizeFundCents / 100).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-foreground-muted">Gross profit</p>
                <p className="font-medium">£{(prizeBreakdown.grossProfitCents / 100).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-foreground-muted">Platform cost</p>
                <p className="font-medium">£{(platformCostCents / 100).toFixed(2)}</p>
              </div>
            </div>
            <p className="mt-3 text-sm">
              Net profit:{" "}
              <span className={netProfitCents >= 0 ? "text-status-alive" : "text-status-eliminated"}>
                £{(netProfitCents / 100).toFixed(2)}
              </span>
            </p>
            <p className="mt-2 text-xs text-foreground-muted">
              Estimated from {entries.length} current player{entries.length === 1 ? "" : "s"} × your
              entry fee, minus the platform&rsquo;s £{(feeConfig.minimum_fee_cents / 100).toFixed(2)}{" "}
              minimum / £{(feeConfig.per_player_fee_cents / 100).toFixed(2)}-per-player fee. This
              platform never collects the entry fee itself, so this is a projection, not a reconciled
              ledger.
            </p>
          </div>
        </section>
      )}

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

      {currentRound && missingPicks.length > 0 && (
        <div className="glass-card mt-6 p-4 text-sm">
          <p className="font-medium text-status-pending">
            Still to pick for round {currentRound.round_number}
          </p>
          <p className="mt-1 text-foreground-muted">
            {missingPicks.map((p) => p.name).join(", ")}
          </p>
        </div>
      )}

      {entries.length > 0 && (
        <section className="mt-8">
          <h2 className="font-[family-name:var(--font-heading)] text-lg font-medium">
            League-wide stats
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="glass-card p-3 text-center">
              <p className="font-[family-name:var(--font-heading)] text-lg font-medium">
                {survival.totalEntries}
              </p>
              <p className="text-xs text-foreground-muted">Total entrants</p>
            </div>
            <div className="glass-card p-3 text-center">
              <p className="font-[family-name:var(--font-heading)] text-lg font-medium">
                {survival.activeOrWinner}
              </p>
              <p className="text-xs text-foreground-muted">Still in</p>
            </div>
            <div className="glass-card p-3 text-center">
              <p className="font-[family-name:var(--font-heading)] text-lg font-medium">
                {survival.eliminated}
              </p>
              <p className="text-xs text-foreground-muted">Eliminated</p>
            </div>
            <div className="glass-card p-3 text-center">
              <p className="font-[family-name:var(--font-heading)] text-lg font-medium">
                {survival.averageSurvivalLength.toFixed(1)}
              </p>
              <p className="text-xs text-foreground-muted">Avg. rounds survived</p>
            </div>
          </div>
        </section>
      )}

      <section className="mt-8">
        <h2 className="font-[family-name:var(--font-heading)] text-lg font-medium">
          Entrants
        </h2>
        <div className="mt-3 flex flex-col gap-2">
          {entries.length === 0 && (
            <EmptyState
              title="No entrants yet"
              description="Share your invite code to get players in."
            />
          )}
          {entries.map((e) => (
            <Link
              key={e.id}
              href={`/games/${slug}/players/${e.id}`}
              className="glass-card flex items-center justify-between px-4 py-3 text-sm hover:bg-surface-glass"
            >
              <span>{e.name}</span>
              <span
                className={
                  e.status === "active" ? "text-status-alive" : "text-status-eliminated"
                }
              >
                {e.status}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {rounds.length > 0 && (
        <section className="mt-8">
          <h2 className="font-[family-name:var(--font-heading)] text-lg font-medium">
            Round history
          </h2>
          <div className="mt-3 flex flex-col gap-2">
            {rounds.map((r) => (
              <div
                key={r.id}
                className="glass-card flex items-center justify-between px-4 py-3 text-sm"
              >
                <span>Round {r.round_number}</span>
                <span className="text-foreground-muted">
                  {r.status === "resolved"
                    ? `${r.wins} survived · ${r.setbacks} out`
                    : r.status === "locked"
                      ? `${r.pending} awaiting results`
                      : "upcoming"}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {trend.length > 0 && (
        <section className="mt-8">
          <h2 className="font-[family-name:var(--font-heading)] text-lg font-medium">
            Survival trend
          </h2>
          <div className="mt-3 flex flex-col gap-2">
            {trend.map((t) => (
              <div
                key={t.round_number}
                className="glass-card flex items-center justify-between px-4 py-3 text-sm"
              >
                <span>Round {t.round_number}</span>
                <span className="text-foreground-muted">
                  {t.active_players} still in
                  {t.eliminated_this_round > 0
                    ? ` · ${t.eliminated_this_round} out`
                    : ""}
                  {t.auto_assigned_picks > 0
                    ? ` · ${t.auto_assigned_picks} auto-pick${t.auto_assigned_picks > 1 ? "s" : ""}`
                    : ""}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

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
