import Link from "next/link";
import { listLeagues } from "@/lib/db/leagues";

export default async function LeaguesPage() {
  const leagues = await listLeagues();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-16">
      <h1 className="font-[family-name:var(--font-heading)] text-3xl font-semibold">
        Leagues
      </h1>
      <p className="mt-1 text-sm text-foreground-muted">
        Standings and form across every competition supported on the platform.
      </p>

      <div className="mt-8 flex flex-col gap-2">
        {leagues.map((league) => (
          <Link
            key={league.id}
            href={`/leagues/${league.id}`}
            className="glass-card flex items-center justify-between px-4 py-3 text-sm hover:bg-surface-glass"
          >
            <span>{league.name}</span>
            <span className="text-foreground-muted">{league.country}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
