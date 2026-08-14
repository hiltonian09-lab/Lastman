import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { getGameBySlug, hasGameStarted } from "@/lib/db/games";
import { listLeagues } from "@/lib/db/leagues";
import { DEFAULT_PRIZE_CONFIG, parsePrizeSplits } from "@/lib/prize";
import { SettingsForm } from "./settings-form";

export default async function GameSettingsPage({
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

  const [leagues, started] = await Promise.all([listLeagues(), hasGameStarted(game.id)]);
  const rules = JSON.parse(game.rules_json);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col px-6 py-16">
      <Link href={`/host/${slug}`} className="text-sm text-foreground-muted hover:text-foreground">
        &larr; Back to {game.name}
      </Link>
      <h1 className="font-[family-name:var(--font-heading)] mt-4 text-2xl font-semibold">
        Game settings
      </h1>

      {started && (
        <p className="glass-card mt-6 p-4 text-sm text-status-pending">
          Round 1 has already locked, so leagues can&rsquo;t change now — that
          would corrupt everyone&rsquo;s pick pool mid-game. Everything else
          is still editable.
        </p>
      )}

      <div className="mt-6">
        <SettingsForm
          slug={slug}
          leagues={leagues}
          currentName={game.name}
          currentLeagueId={JSON.parse(game.league_ids)[0] ?? ""}
          leaguesLocked={started}
          currentMaxPlayers={game.max_players}
          currentMissedPickPolicy={rules.missedPickPolicy}
          currentDisplayEntryFee={
            game.display_entry_fee_cents !== null
              ? (game.display_entry_fee_cents / 100).toFixed(2)
              : ""
          }
          currentVisibility={game.visibility}
          isOfficial={game.type === "platform_official"}
          currentStartsAt={game.starts_at ? game.starts_at.slice(0, 10) : ""}
          currentPrizeFundPercent={game.prize_fund_percent ?? DEFAULT_PRIZE_CONFIG.prizeFundPercent}
          currentPrizePlaces={game.prize_places ?? DEFAULT_PRIZE_CONFIG.splitPercents.length}
          currentPrizeSplits={
            parsePrizeSplits(game.prize_splits_json) ?? DEFAULT_PRIZE_CONFIG.splitPercents
          }
          currentBoobyPrizePercent={game.booby_prize_percent ?? DEFAULT_PRIZE_CONFIG.boobyPercent}
          currentLogoDataUrl={game.logo_data_url}
        />
      </div>
    </div>
  );
}
