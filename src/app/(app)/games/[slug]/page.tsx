import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { getGameBySlug } from "@/lib/db/games";
import { getGameEntry, getPickForRound } from "@/lib/db/picks";
import { ensureCurrentRound } from "@/lib/db/rounds";
import { getAvailablePicks } from "@/lib/football/round-pool";
import { listEntriesForGame } from "@/lib/db/game-entries";
import { listGameMessages } from "@/lib/db/messages";
import { getSyncStatus } from "@/lib/db/sync-status";
import { formatRelativeTime } from "@/lib/format/relative-time";
import { getLeaguesByIds } from "@/lib/db/leagues";
import { getUpcomingFixturesPreview } from "@/lib/db/game-fixtures-preview";
import { getRecentFormForTeams, getHeadToHeadForTeams } from "@/lib/db/team-form";
import { getPreviousSeasonPositions } from "@/lib/db/standings";
import { parsePrizeSplits } from "@/lib/prize";
import { PrizeFundCard } from "@/components/prize-fund-card";
import { LeagueInfoCard } from "@/components/league-info-card";
import { PickForm } from "./pick-form";

export default async function PlayerGamePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const game = await getGameBySlug(slug);
  if (!game) redirect("/games");

  const entry = await getGameEntry(game.id, user.id);
  if (!entry) redirect("/games");

  if (game.status === "blocked") {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <h1 className="font-[family-name:var(--font-heading)] text-2xl font-semibold">
          This game is temporarily unavailable
        </h1>
        <p className="mt-2 text-sm text-foreground-muted">
          The organiser&rsquo;s payment needs updating. Picks and standings will
          be back as soon as that&rsquo;s sorted — you won&rsquo;t lose your
          spot.
        </p>
      </div>
    );
  }

  if (entry.status === "eliminated") {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mb-3 h-2 w-2 rounded-full bg-status-eliminated" />
        <h1 className="font-[family-name:var(--font-heading)] text-2xl font-semibold">
          You&rsquo;re out of {game.name}
        </h1>
        <p className="mt-2 text-sm text-foreground-muted">
          Better luck in the next one — you can still follow the standings.
        </p>
        <Link
          href={`/games/${slug}/players/${entry.id}`}
          className="mt-6 rounded-full border border-border-glass px-6 py-3 text-sm hover:bg-surface-glass"
        >
          View your pick history
        </Link>
      </div>
    );
  }

  const round = await ensureCurrentRound(game);
  const leagueIds: string[] = JSON.parse(game.league_ids);
  const [options, currentPick, entries, messages, fixturesSync, leagues, upcomingFixtures] =
    await Promise.all([
      getAvailablePicks(game, entry.id, undefined, round.id, new Date(round.deadline_at)),
      getPickForRound(entry.id, round.id),
      listEntriesForGame(game.id),
      listGameMessages(game.id),
      getSyncStatus("live_scores"),
      getLeaguesByIds(leagueIds),
      getUpcomingFixturesPreview(leagueIds),
    ]);

  const activeCount = entries.filter((e) => e.status === "active").length;
  const optionTeamIds = Array.from(new Set(options.map((o) => o.teamId)));

  const [recentFormMap, headToHeadMap, previousPositions] = await Promise.all([
    getRecentFormForTeams(optionTeamIds),
    getHeadToHeadForTeams(options.map((o) => ({ teamId: o.teamId, opponentId: o.opponentId }))),
    getPreviousSeasonPositions(optionTeamIds),
  ]);
  const recentForm = Object.fromEntries(recentFormMap);
  const headToHead = Object.fromEntries(headToHeadMap);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-16">
      <h1 className="font-[family-name:var(--font-heading)] text-3xl font-semibold">
        {game.name}
      </h1>
      <p className="mt-1 text-sm text-foreground-muted">
        Round {round.round_number} · Lives remaining: {entry.lives_remaining} ·{" "}
        {activeCount}/{entries.length} still in
      </p>

      {messages.length > 0 && (
        <div className="glass-card mt-6 p-4">
          <p className="text-xs uppercase tracking-wide text-foreground-muted">
            From your organiser
          </p>
          <p className="mt-1 text-sm">{messages[0].body}</p>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-4">
        <LeagueInfoCard leagues={leagues} upcomingFixtures={upcomingFixtures} />
        <PrizeFundCard
          entryFeeCents={game.display_entry_fee_cents}
          playerCount={entries.length}
          prizeFundPercent={game.prize_fund_percent}
          splitPercents={parsePrizeSplits(game.prize_splits_json)}
          boobyPercent={game.booby_prize_percent}
        />
      </div>

      <div className="mt-8">
        <PickForm
          slug={slug}
          options={options}
          currentPickTeamId={currentPick?.team_id ?? null}
          recentForm={recentForm}
          headToHead={headToHead}
          previousPositions={Object.fromEntries(previousPositions)}
        />
        {fixturesSync && (
          <p className="mt-3 text-xs text-foreground-muted">
            Fixtures updated {formatRelativeTime(fixturesSync.last_synced_at)}
          </p>
        )}
      </div>

      <section className="mt-10">
        <h2 className="font-[family-name:var(--font-heading)] text-lg font-medium">
          Standings
        </h2>
        <div className="mt-3 flex flex-col gap-2">
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
    </div>
  );
}
