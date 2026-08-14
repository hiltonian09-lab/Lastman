import Link from "next/link";
import { notFound } from "next/navigation";
import { getLeaguesByIds } from "@/lib/db/leagues";
import { getLeagueTable } from "@/lib/db/league-table";
import { getStandingsHistory } from "@/lib/db/standings";
import { EmptyState } from "@/components/empty-state";
import type { FormResult } from "@/lib/db/team-form";

const FORM_COLOR: Record<FormResult, string> = {
  W: "bg-status-alive text-black",
  D: "bg-status-pending text-black",
  L: "bg-status-eliminated text-white",
};

function FormBadges({ form }: { form: FormResult[] }) {
  if (form.length === 0) {
    return <span className="text-xs text-foreground-muted">—</span>;
  }
  return (
    <span className="flex gap-1">
      {form.map((r, i) => (
        <span
          key={i}
          className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${FORM_COLOR[r]}`}
        >
          {r}
        </span>
      ))}
    </span>
  );
}

export default async function LeagueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [league] = await getLeaguesByIds([id]);
  if (!league) notFound();

  const [table, history] = await Promise.all([
    getLeagueTable(id),
    getStandingsHistory(id),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-16">
      <Link
        href="/leagues"
        className="text-sm text-foreground-muted hover:text-foreground"
      >
        &larr; Back to leagues
      </Link>

      <h1 className="font-[family-name:var(--font-heading)] mt-4 text-3xl font-semibold">
        {league.name}
      </h1>
      <p className="mt-1 text-sm text-foreground-muted">Standings · form · league-wide stats</p>

      {table.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No fixtures yet"
            description="Once the season starts and results are synced, the table will appear here."
          />
        </div>
      ) : (
        <div className="mt-8 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-glass text-left text-foreground-muted">
                <th className="py-2 pr-2">#</th>
                <th className="py-2 pr-2">Team</th>
                <th className="py-2 pr-2">P</th>
                <th className="hidden py-2 pr-2 sm:table-cell">W</th>
                <th className="hidden py-2 pr-2 sm:table-cell">D</th>
                <th className="hidden py-2 pr-2 sm:table-cell">L</th>
                <th className="hidden py-2 pr-2 sm:table-cell">GF</th>
                <th className="hidden py-2 pr-2 sm:table-cell">GA</th>
                <th className="hidden py-2 pr-2 sm:table-cell">GD</th>
                <th className="py-2 pr-2">Pts</th>
                <th className="py-2">Form</th>
              </tr>
            </thead>
            <tbody>
              {table.map((row) => (
                <tr
                  key={row.teamId}
                  className="border-b border-border-glass/50 last:border-0"
                >
                  <td className="py-3 pr-2 text-foreground-muted">{row.position}</td>
                  <td className="py-3 pr-2 font-medium">{row.teamName}</td>
                  <td className="py-3 pr-2 text-foreground-muted">{row.played}</td>
                  <td className="hidden py-3 pr-2 text-foreground-muted sm:table-cell">{row.won}</td>
                  <td className="hidden py-3 pr-2 text-foreground-muted sm:table-cell">{row.drawn}</td>
                  <td className="hidden py-3 pr-2 text-foreground-muted sm:table-cell">{row.lost}</td>
                  <td className="hidden py-3 pr-2 text-foreground-muted sm:table-cell">{row.goalsFor}</td>
                  <td className="hidden py-3 pr-2 text-foreground-muted sm:table-cell">{row.goalsAgainst}</td>
                  <td className="hidden py-3 pr-2 text-foreground-muted sm:table-cell">{row.goalDifference}</td>
                  <td className="py-3 pr-2 font-medium">{row.points}</td>
                  <td className="py-3">
                    <FormBadges form={row.form} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {history.seasons.length > 0 && (
        <section className="mt-10">
          <h2 className="font-[family-name:var(--font-heading)] text-lg font-medium">
            Standings history
          </h2>
          <p className="mt-1 text-sm text-foreground-muted">
            Final position by season — a blank cell means the team wasn&rsquo;t in this
            league that season.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-glass text-left text-foreground-muted">
                  <th className="py-2 pr-2">Team</th>
                  {history.seasons.map((season) => (
                    <th key={season} className="py-2 pr-2 text-right">
                      {season}/{String(Number(season) + 1).slice(-2)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.teams.map((team) => (
                  <tr key={team.teamId} className="border-b border-border-glass/50 last:border-0">
                    <td className="py-3 pr-2 font-medium">{team.teamName}</td>
                    {history.seasons.map((season) => (
                      <td key={season} className="py-3 pr-2 text-right text-foreground-muted">
                        {team.positionsBySeason[season] ?? "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
