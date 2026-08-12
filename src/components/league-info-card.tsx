import type { LeagueRow } from "@/lib/db/leagues";
import type { UpcomingFixture } from "@/lib/db/game-fixtures-preview";

function formatKickoff(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London",
  });
}

export function LeagueInfoCard({
  leagues,
  upcomingFixtures,
}: {
  leagues: LeagueRow[];
  upcomingFixtures: UpcomingFixture[];
}) {
  return (
    <div className="glass-card p-4">
      <p className="text-xs uppercase tracking-wide text-foreground-muted">Leagues</p>
      <div className="mt-1 flex flex-wrap gap-2">
        {leagues.map((l) => (
          <span
            key={l.id}
            className="rounded-full border border-border-glass px-3 py-1 text-xs"
          >
            {l.name}
          </span>
        ))}
      </div>

      {upcomingFixtures.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs uppercase tracking-wide text-foreground-muted">
            Upcoming fixtures
          </p>
          <div className="mt-2 flex flex-col gap-1">
            {upcomingFixtures.map((f, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span>
                  {f.home_team} vs {f.away_team}
                </span>
                <span className="text-xs text-foreground-muted">
                  {formatKickoff(f.kickoff_at)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-3 text-sm text-foreground-muted">
          No fixtures scheduled yet for these leagues — check back closer to
          the season/round starting.
        </p>
      )}
    </div>
  );
}
