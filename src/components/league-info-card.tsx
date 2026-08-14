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

export function UpcomingFixturesCard({
  upcomingFixtures,
}: {
  upcomingFixtures: UpcomingFixture[];
}) {
  if (upcomingFixtures.length === 0) return null;

  return (
    <div className="glass-card p-4">
      <p className="text-xs uppercase tracking-wide text-foreground-muted">Upcoming fixtures</p>
      <div className="mt-2 flex flex-col gap-1">
        {upcomingFixtures.map((f, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <span>
              {f.home_team} vs {f.away_team}
            </span>
            <span className="text-xs text-foreground-muted">{formatKickoff(f.kickoff_at)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
