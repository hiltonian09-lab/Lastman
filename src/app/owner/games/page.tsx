import Link from "next/link";
import { listAllGames } from "@/lib/db/platform";

function statusColor(status: string): string {
  if (status === "open" || status === "in_progress") return "text-status-alive";
  if (status === "blocked") return "text-status-pending";
  if (status === "draft") return "text-foreground-muted";
  return "text-foreground-muted";
}

export default async function OwnerGamesPage() {
  const games = await listAllGames();

  return (
    <div>
      <h1 className="font-[family-name:var(--font-heading)] text-2xl font-semibold">
        All games
      </h1>
      <p className="mt-1 text-sm text-foreground-muted">
        {games.length} total — click any game to manage it, see its invite
        link, or message its players.
      </p>

      <div className="mt-6 flex flex-col gap-2">
        {games.length === 0 && (
          <p className="text-sm text-foreground-muted">No games created yet.</p>
        )}
        {games.map((g) => (
          <Link
            key={g.id}
            href={g.status === "draft" ? `/host/${g.slug}/setup` : `/host/${g.slug}`}
            className="glass-card flex items-center justify-between px-4 py-3 text-sm hover:bg-surface-glass"
          >
            <div>
              <p className="font-medium">{g.name}</p>
              <p className="text-xs text-foreground-muted">
                {g.type === "platform_official" ? "Official" : "Private"} · by{" "}
                {g.owner_name} · {g.entry_count} player{g.entry_count === 1 ? "" : "s"}
                {g.invite_code && <> · {g.invite_code}</>}
              </p>
            </div>
            <span className={statusColor(g.status)}>{g.status}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
