import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { getGameBySlug } from "@/lib/db/games";
import { isUserInGame } from "@/lib/db/game-entries";
import { getEntryDetail, getPickHistoryForEntry } from "@/lib/db/round-stats";
import { getPlayerStats } from "@/lib/db/stats";

function formatKickoff(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "Europe/London",
  });
}

const RESULT_LABEL: Record<string, string> = {
  win: "Won",
  loss: "Lost",
  draw: "Drew",
  void: "Voided",
};

const RESULT_COLOR: Record<string, string> = {
  win: "text-status-alive",
  loss: "text-status-eliminated",
  draw: "text-status-pending",
  void: "text-foreground-muted",
};

export default async function PlayerHistoryPage({
  params,
}: {
  params: Promise<{ slug: string; entryId: string }>;
}) {
  const { slug, entryId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const game = await getGameBySlug(slug);
  if (!game) redirect("/dashboard");

  const entry = await getEntryDetail(entryId);
  if (!entry || entry.game_slug !== slug) redirect(`/games/${slug}`);

  const isMember = await isUserInGame(user.id, game.id);
  const canView = isMember || game.owner_id === user.id || user.role === "platform_owner";
  if (!canView) redirect(`/games/${slug}`);

  const [history, stats] = await Promise.all([
    getPickHistoryForEntry(entryId),
    getPlayerStats(entryId),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-6 py-16">
      <Link
        href={`/games/${slug}`}
        className="text-sm text-foreground-muted hover:text-foreground"
      >
        &larr; Back to {game.name}
      </Link>

      <div className="mt-4 flex items-center justify-between">
        <h1 className="font-[family-name:var(--font-heading)] text-2xl font-semibold">
          {entry.name}
        </h1>
        <span
          className={
            entry.status === "active"
              ? "text-status-alive"
              : entry.status === "winner"
                ? "text-gold"
                : "text-status-eliminated"
          }
        >
          {entry.status}
        </span>
      </div>
      <p className="mt-1 text-sm text-foreground-muted">
        Lives remaining: {entry.lives_remaining} · Joined{" "}
        {new Date(entry.joined_at).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          timeZone: "Europe/London",
        })}
      </p>

      {stats && (
        <section className="mt-8">
          <h2 className="font-[family-name:var(--font-heading)] text-lg font-medium">
            Your stats
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="glass-card p-3 text-center">
              <p className="font-[family-name:var(--font-heading)] text-lg font-medium">
                {stats.roundsSurvived}
              </p>
              <p className="text-xs text-foreground-muted">Rounds survived</p>
            </div>
            <div className="glass-card p-3 text-center">
              <p className="font-[family-name:var(--font-heading)] text-lg font-medium">
                {stats.picksUsed}
              </p>
              <p className="text-xs text-foreground-muted">Picks used</p>
            </div>
            <div className="glass-card p-3 text-center">
              <p className="font-[family-name:var(--font-heading)] text-lg font-medium">
                {stats.currentStreak}
              </p>
              <p className="text-xs text-foreground-muted">Win streak</p>
            </div>
            <div className="glass-card p-3 text-center">
              <p className="font-[family-name:var(--font-heading)] text-lg font-medium">
                {stats.wins}-{stats.losses}-{stats.draws}
              </p>
              <p className="text-xs text-foreground-muted">W-L-D</p>
            </div>
          </div>
        </section>
      )}

      <section className="mt-8">
        <h2 className="font-[family-name:var(--font-heading)] text-lg font-medium">
          Pick history
        </h2>
        <div className="mt-3 flex flex-col gap-2">
          {history.length === 0 && (
            <p className="text-sm text-foreground-muted">
              No completed rounds yet — check back once the first gameweek
              resolves.
            </p>
          )}
          {history.map((h, i) => (
            <div
              key={i}
              className="glass-card flex items-center justify-between px-4 py-3 text-sm"
            >
              <div>
                <p>
                  Round {h.round_number}: {h.team_name}
                  {h.auto_assigned ? (
                    <span className="ml-2 text-xs text-foreground-muted">(auto-assigned)</span>
                  ) : null}
                </p>
                <p className="text-xs text-foreground-muted">{formatKickoff(h.kickoff_at)}</p>
              </div>
              <span className={RESULT_COLOR[h.result]}>{RESULT_LABEL[h.result] ?? h.result}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
