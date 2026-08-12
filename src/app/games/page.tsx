import Link from "next/link";
import { listPublicOpenGames } from "@/lib/db/games";
import { joinPublicGameAction } from "../join/actions";

export default async function BrowseGamesPage() {
  const games = await listPublicOpenGames();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-16">
      <div className="flex items-center justify-between">
        <h1 className="font-[family-name:var(--font-heading)] text-3xl font-semibold">
          Browse games
        </h1>
        <Link
          href="/join"
          className="rounded-full border border-border-glass px-4 py-2 text-sm hover:bg-surface-glass"
        >
          Have an invite code?
        </Link>
      </div>

      {games.length === 0 && (
        <p className="mt-8 text-sm text-foreground-muted">
          No public games right now — check back once the season kicks off, or
          use an invite code from an organiser.
        </p>
      )}

      <div className="mt-8 flex flex-col gap-4">
        {games.map((game) => {
          const joinAction = joinPublicGameAction.bind(null, game.slug);
          return (
            <div key={game.id} className="glass-card flex items-center justify-between p-6">
              <div>
                <h2 className="font-[family-name:var(--font-heading)] text-lg font-medium">
                  {game.name}
                </h2>
                <p className="text-sm text-foreground-muted">
                  {game.max_players ? `Up to ${game.max_players} players` : "Unlimited players"}
                </p>
              </div>
              <form action={joinAction}>
                <button
                  type="submit"
                  className="rounded-full bg-royal-blue px-5 py-2 text-sm font-medium text-white hover:bg-royal-blue-deep"
                >
                  Join
                </button>
              </form>
            </div>
          );
        })}
      </div>
    </div>
  );
}
