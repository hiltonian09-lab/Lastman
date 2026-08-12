"use client";

import { useActionState, useState } from "react";
import { submitPickAction, type PickFormState } from "./actions";
import type { PickOption } from "@/lib/football/round-pool";

const initialState: PickFormState = {};

function formatKickoff(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PickForm({
  slug,
  options,
  currentPickTeamId,
}: {
  slug: string;
  options: PickOption[];
  currentPickTeamId: string | null;
}) {
  const action = submitPickAction.bind(null, slug);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [selected, setSelected] = useState<PickOption | null>(null);

  const fixtureGroups = new Map<string, PickOption[]>();
  for (const opt of options) {
    const group = fixtureGroups.get(opt.fixtureId) ?? [];
    group.push(opt);
    fixtureGroups.set(opt.fixtureId, group);
  }
  const groups = Array.from(fixtureGroups.entries());
  const next = options[0];

  return (
    <div>
      {next && (
        <div className="glass-card mb-6 p-6">
          <p className="text-xs uppercase tracking-wide text-gold">Next fixture</p>
          <p className="font-[family-name:var(--font-heading)] mt-1 text-lg font-medium">
            {next.isHome ? next.teamName : next.opponentName} vs{" "}
            {next.isHome ? next.opponentName : next.teamName}
          </p>
          <p className="text-sm text-foreground-muted">{formatKickoff(next.kickoffAt)}</p>
        </div>
      )}

      <form action={formAction} className="flex flex-col gap-3">
        <input type="hidden" name="fixtureId" value={selected?.fixtureId ?? ""} />
        <input type="hidden" name="teamId" value={selected?.teamId ?? ""} />

        {groups.map(([fixtureId, group]) => {
          const [a, b] = group.length === 2 ? group : [group[0], null];
          return (
            <div
              key={fixtureId}
              className="glass-card flex items-center justify-between gap-4 p-4"
            >
              <div className="flex flex-1 flex-col gap-2 sm:flex-row">
                {[a, b].filter(Boolean).map((opt) => {
                  const o = opt as PickOption;
                  const isCurrent = currentPickTeamId === o.teamId;
                  const isSelected = selected?.teamId === o.teamId;
                  return (
                    <button
                      key={o.teamId}
                      type="button"
                      onClick={() => setSelected(o)}
                      className={`flex-1 rounded-lg border px-4 py-2 text-left text-sm transition-colors ${
                        isSelected || isCurrent
                          ? "border-royal-blue bg-royal-blue/10"
                          : "border-border-glass hover:bg-surface-glass"
                      }`}
                    >
                      <span className="font-medium">{o.teamName}</span>
                      <span className="block text-xs text-foreground-muted">
                        {o.isHome ? "Home" : "Away"} vs {o.opponentName}
                      </span>
                    </button>
                  );
                })}
              </div>
              <span className="whitespace-nowrap text-xs text-foreground-muted">
                {formatKickoff(group[0].kickoffAt)}
              </span>
            </div>
          );
        })}

        {options.length === 0 && (
          <p className="text-sm text-foreground-muted">
            No fixtures available to pick from this gameweek yet — check back
            closer to kickoff.
          </p>
        )}

        {state.error && <p className="text-sm text-red-400">{state.error}</p>}

        <button
          type="submit"
          disabled={pending || !selected}
          className="mt-2 self-start rounded-full bg-royal-blue px-6 py-3 font-medium text-white transition-colors hover:bg-royal-blue-deep disabled:opacity-50"
        >
          {pending ? "Saving…" : "Confirm pick"}
        </button>
      </form>
    </div>
  );
}
