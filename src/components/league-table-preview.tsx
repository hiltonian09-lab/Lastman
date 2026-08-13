import Link from "next/link";
import type { LeagueTableRow } from "@/lib/db/league-table";
import type { FormResult } from "@/lib/db/team-form";

const FORM_COLOR: Record<FormResult, string> = {
  W: "bg-status-alive text-black",
  D: "bg-status-pending text-black",
  L: "bg-status-eliminated text-white",
};

function FormBadges({ form }: { form: FormResult[] }) {
  if (form.length === 0) return null;
  return (
    <span className="flex gap-0.5">
      {form.map((r, i) => (
        <span
          key={i}
          className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold ${FORM_COLOR[r]}`}
        >
          {r}
        </span>
      ))}
    </span>
  );
}

export function LeagueTablePreview({
  leagueId,
  leagueName,
  rows,
  limit = 5,
}: {
  leagueId: string;
  leagueName: string;
  rows: LeagueTableRow[];
  limit?: number;
}) {
  const top = rows.slice(0, limit);

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-gold">{leagueName}</p>
        <Link
          href={`/leagues/${leagueId}`}
          className="text-xs text-foreground-muted hover:text-foreground"
        >
          Full table &rarr;
        </Link>
      </div>

      {top.length === 0 ? (
        <p className="mt-2 text-sm text-foreground-muted">
          No results yet this season — check back once fixtures are played.
        </p>
      ) : (
        <div className="mt-2 flex flex-col gap-1">
          {top.map((row) => (
            <div key={row.teamId} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <span className="w-4 text-xs text-foreground-muted">{row.position}</span>
                <span>{row.teamName}</span>
              </span>
              <span className="flex items-center gap-3">
                <FormBadges form={row.form} />
                <span className="w-6 text-right text-xs text-foreground-muted">{row.points}pts</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
