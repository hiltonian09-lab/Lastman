import Link from "next/link";
import { notFound } from "next/navigation";
import { getLeaguesByIds } from "@/lib/db/leagues";
import { getLeagueTable } from "@/lib/db/league-table";
import { getStandingsHistory } from "@/lib/db/standings";
import { EmptyState } from "@/components/empty-state";
import { SeasonStandingsView } from "@/components/season-standings-view";

/** European football seasons run roughly Aug-May, so a date in Jan-Jul still
 * belongs to the season that started the previous August. */
function currentSeasonLabel(now: Date): string {
  const year = now.getUTCMonth() >= 7 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
  return `${year}/${String(year + 1).slice(-2)}`;
}

export default async function LeagueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [league] = await getLeaguesByIds([id]);
  if (!league) notFound();

  const [table, history] = await Promise.all([getLeagueTable(id), getStandingsHistory(id)]);

  const hasAnyData = table.length > 0 || history.length > 0;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-16">
      <Link href="/leagues" className="text-sm text-foreground-muted hover:text-foreground">
        &larr; Back to leagues
      </Link>

      <h1 className="font-[family-name:var(--font-heading)] mt-4 text-3xl font-semibold">
        {league.name}
      </h1>
      <p className="mt-1 text-sm text-foreground-muted">Standings · form · league-wide stats</p>

      {!hasAnyData ? (
        <div className="mt-8">
          <EmptyState
            title="No standings yet"
            description="Once fixtures are played and results are synced, tables will appear here."
          />
        </div>
      ) : (
        <div className="mt-8">
          <SeasonStandingsView
            currentSeasonRows={table}
            currentSeasonLabel={currentSeasonLabel(new Date())}
            history={history}
          />
        </div>
      )}
    </div>
  );
}
