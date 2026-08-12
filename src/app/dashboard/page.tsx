import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { listGamesForUser } from "@/lib/db/game-entries";
import { listGamesOwnedBy } from "@/lib/db/games";
import { logoutAction } from "../(auth)/actions";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [playing, hosting] = await Promise.all([
    listGamesForUser(user.id),
    listGamesOwnedBy(user.id),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-16">
      <div className="flex items-center justify-between">
        <h1 className="font-[family-name:var(--font-heading)] text-2xl font-semibold">
          Hey, {user.name}
        </h1>
        <form action={logoutAction}>
          <button
            type="submit"
            className="rounded-full border border-border-glass px-4 py-2 text-sm hover:bg-surface-glass"
          >
            Sign out
          </button>
        </form>
      </div>

      <div className="mt-8 flex gap-4">
        <Link
          href="/join"
          className="rounded-full bg-royal-blue px-4 py-2 text-sm font-medium text-white hover:bg-royal-blue-deep"
        >
          Join a game
        </Link>
        <Link
          href="/host/new"
          className="rounded-full border border-border-glass px-4 py-2 text-sm hover:bg-surface-glass"
        >
          Host a game
        </Link>
      </div>

      <section className="mt-10">
        <h2 className="font-[family-name:var(--font-heading)] text-lg font-medium">
          Playing
        </h2>
        {playing.length === 0 ? (
          <p className="mt-3 text-sm text-foreground-muted">
            You&rsquo;re not in any games yet.
          </p>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            {playing.map((g) => (
              <Link
                key={g.id}
                href={`/games/${g.slug}`}
                className="glass-card flex items-center justify-between px-4 py-3 text-sm hover:bg-surface-glass"
              >
                <span>{g.name}</span>
                <span className="text-foreground-muted">{g.status}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {hosting.length > 0 && (
        <section className="mt-10">
          <h2 className="font-[family-name:var(--font-heading)] text-lg font-medium">
            Hosting
          </h2>
          <div className="mt-3 flex flex-col gap-2">
            {hosting.map((g) => (
              <Link
                key={g.id}
                href={g.status === "draft" ? `/host/${g.slug}/setup` : `/host/${g.slug}`}
                className="glass-card flex items-center justify-between px-4 py-3 text-sm hover:bg-surface-glass"
              >
                <span>{g.name}</span>
                <span className="text-foreground-muted">{g.status}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
