"use client";

import { useActionState, useState } from "react";
import { submitPickAction, type PickFormState } from "./actions";
import type { PickOption } from "@/lib/football/round-pool";
import type { FormResult } from "@/lib/db/team-form";

const initialState: PickFormState = {};

function formatKickoff(iso: string): string {
  // Explicit timeZone so this renders identically on the server (SSR) and the
  // client (hydration) regardless of the visitor's local timezone.
  return new Date(iso).toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London",
  });
}

const FORM_COLOR: Record<FormResult, string> = {
  W: "bg-status-alive text-black",
  D: "bg-status-pending text-black",
  L: "bg-status-eliminated text-white",
};

function FormBadges({ form }: { form?: FormResult[] }) {
  if (!form || form.length === 0) {
    return <span className="text-xs text-foreground-muted">No recent matches yet</span>;
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

export function PickForm({
  slug,
  options,
  currentPickTeamId,
  recentForm,
}: {
  slug: string;
  options: PickOption[];
  currentPickTeamId: string | null;
  recentForm: Record<string, FormResult[]>;
}) {
  const action = submitPickAction.bind(null, slug);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [selectedTeamId, setSelectedTeamId] = useState(currentPickTeamId ?? "");

  const selectedOption = options.find((o) => o.teamId === selectedTeamId) ?? null;

  const fixtureGroups = new Map<string, PickOption[]>();
  for (const opt of options) {
    const group = fixtureGroups.get(opt.fixtureId) ?? [];
    group.push(opt);
    fixtureGroups.set(opt.fixtureId, group);
  }
  const groups = Array.from(fixtureGroups.entries());
  const sortedByName = [...options].sort((a, b) => a.teamName.localeCompare(b.teamName));
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

      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="fixtureId" value={selectedOption?.fixtureId ?? ""} />
        <input type="hidden" name="teamId" value={selectedTeamId} />

        {options.length > 0 && (
          <label className="flex flex-col gap-1 text-sm">
            Pick your team
            <select
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
              className="rounded-lg border border-border-glass bg-transparent px-3 py-2 outline-none focus:border-royal-blue"
            >
              {/* Not disabled on purpose: a disabled option that doesn't match the
                  controlled value makes some browsers silently show the first real
                  team as "selected" without firing onChange, which was letting a
                  pick submit with a team the player never actually chose. */}
              <option value="">Choose a team…</option>
              {sortedByName.map((o) => (
                <option key={o.teamId} value={o.teamId} className="bg-background">
                  {o.teamName} ({o.isHome ? "Home" : "Away"} vs {o.opponentName})
                </option>
              ))}
            </select>
          </label>
        )}

        {selectedOption && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-foreground-muted">{selectedOption.teamName} form:</span>
            <FormBadges form={recentForm[selectedOption.teamId]} />
          </div>
        )}

        {options.length === 0 && (
          <p className="text-sm text-foreground-muted">
            No fixtures available to pick from this gameweek yet — check back
            closer to kickoff.
          </p>
        )}

        {state.error && <p className="text-sm text-red-400">{state.error}</p>}

        <button
          type="submit"
          disabled={pending || !selectedTeamId}
          className="self-start rounded-full bg-royal-blue px-6 py-3 font-medium text-white transition-colors hover:bg-royal-blue-deep disabled:opacity-50"
        >
          {pending ? "Saving…" : "Confirm pick"}
        </button>

        {groups.length > 0 && (
          <div className="mt-2 flex flex-col gap-3">
            {groups.map(([fixtureId, group]) => {
              const [a, b] = group.length === 2 ? group : [group[0], null];
              const isHighlighted = selectedOption?.fixtureId === fixtureId;
              return (
                <div
                  key={fixtureId}
                  className={`glass-card flex items-center justify-between gap-4 p-4 transition-colors ${
                    isHighlighted ? "border-gold bg-gold/5" : ""
                  }`}
                >
                  <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                    {[a, b].filter(Boolean).map((opt, i) => {
                      const o = opt as PickOption;
                      const isThisTeamSelected = selectedTeamId === o.teamId;
                      return (
                        <span key={o.teamId} className="flex items-center gap-2">
                          {i === 1 && <span className="text-foreground-muted">vs</span>}
                          <span
                            className={`text-sm ${isThisTeamSelected ? "font-semibold text-gold" : ""}`}
                          >
                            {o.teamName}
                          </span>
                          <FormBadges form={recentForm[o.teamId]} />
                        </span>
                      );
                    })}
                  </div>
                  <span className="whitespace-nowrap text-xs text-foreground-muted">
                    {formatKickoff(group[0].kickoffAt)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </form>
    </div>
  );
}
