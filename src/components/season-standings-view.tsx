"use client";

import { useState } from "react";
import type { LeagueTableRow } from "@/lib/db/league-table";
import type { SeasonStandings } from "@/lib/db/standings";
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

function seasonLabel(season: string): string {
  return `${season}/${String(Number(season) + 1).slice(-2)}`;
}

interface Row {
  teamId: string;
  teamName: string;
  position: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  form?: FormResult[];
}

export function SeasonStandingsView({
  currentSeasonRows,
  currentSeasonLabel,
  history,
}: {
  currentSeasonRows: LeagueTableRow[];
  currentSeasonLabel: string;
  history: SeasonStandings[];
}) {
  const options: { key: string; label: string; rows: Row[]; showForm: boolean }[] = [
    { key: "current", label: currentSeasonLabel, rows: currentSeasonRows, showForm: true },
    ...history.map((h) => ({
      key: h.season,
      label: seasonLabel(h.season),
      rows: h.rows,
      showForm: false,
    })),
  ];

  const [selected, setSelected] = useState(options[0]?.key ?? "current");
  const active = options.find((o) => o.key === selected) ?? options[0];

  if (!active) return null;

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.key}
            type="button"
            onClick={() => setSelected(o.key)}
            className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
              o.key === selected
                ? "border-royal-blue bg-royal-blue text-white"
                : "border-border-glass hover:bg-surface-glass"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      <div className="mt-4 overflow-x-auto">
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
              {active.showForm && <th className="py-2">Form</th>}
            </tr>
          </thead>
          <tbody>
            {active.rows.map((row) => (
              <tr key={row.teamId} className="border-b border-border-glass/50 last:border-0">
                <td className="py-3 pr-2 text-foreground-muted">{row.position}</td>
                <td className="py-3 pr-2 font-medium">{row.teamName}</td>
                <td className="py-3 pr-2 text-foreground-muted">{row.played}</td>
                <td className="hidden py-3 pr-2 text-foreground-muted sm:table-cell">{row.won}</td>
                <td className="hidden py-3 pr-2 text-foreground-muted sm:table-cell">{row.drawn}</td>
                <td className="hidden py-3 pr-2 text-foreground-muted sm:table-cell">{row.lost}</td>
                <td className="hidden py-3 pr-2 text-foreground-muted sm:table-cell">
                  {row.goalsFor}
                </td>
                <td className="hidden py-3 pr-2 text-foreground-muted sm:table-cell">
                  {row.goalsAgainst}
                </td>
                <td className="hidden py-3 pr-2 text-foreground-muted sm:table-cell">
                  {row.goalDifference}
                </td>
                <td className="py-3 pr-2 font-medium">{row.points}</td>
                {active.showForm && (
                  <td className="py-3">
                    <FormBadges form={row.form ?? []} />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
