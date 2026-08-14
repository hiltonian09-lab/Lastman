"use client";

import { useActionState } from "react";
import { createOfficialGameAction, type OfficialGameFormState } from "./actions";
import { LeaguePicker } from "@/components/league-picker";
import type { LeagueRow } from "@/lib/db/leagues";

const initialState: OfficialGameFormState = {};

export function OfficialGameForm({ leagues }: { leagues: LeagueRow[] }) {
  const [state, formAction, pending] = useActionState(createOfficialGameAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        Game name
        <input
          name="name"
          type="text"
          required
          placeholder="e.g. The Gauntlet Official — Premier League"
          className="rounded-lg border border-border-glass bg-transparent px-3 py-2 outline-none focus:border-royal-blue"
        />
      </label>

      <LeaguePicker leagues={leagues} />

      <label className="flex flex-col gap-1 text-sm">
        Round 1 start date (optional)
        <input
          name="startsAt"
          type="date"
          className="rounded-lg border border-border-glass bg-transparent px-3 py-2 outline-none focus:border-royal-blue"
        />
        <span className="text-xs text-foreground-muted">
          Leave blank to use the nearest upcoming fixtures. Set this if the
          league&rsquo;s season hasn&rsquo;t started yet.
        </span>
      </label>

      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Lives
          <select
            name="lives"
            defaultValue={0}
            className="rounded-lg border border-border-glass bg-transparent px-3 py-2 outline-none focus:border-royal-blue"
          >
            <option value={0}>0 — single life (classic)</option>
            <option value={1}>1 extra life</option>
            <option value={2}>2 extra lives</option>
            <option value={3}>3 extra lives</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Max players
          <input
            name="maxPlayers"
            type="number"
            min={2}
            placeholder="Unlimited"
            className="rounded-lg border border-border-glass bg-transparent px-3 py-2 outline-none focus:border-royal-blue"
          />
        </label>
      </div>

      {state.error && <p className="text-sm text-red-400">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 self-start rounded-full bg-royal-blue px-6 py-3 font-medium text-white transition-colors hover:bg-royal-blue-deep disabled:opacity-60"
      >
        {pending ? "Creating…" : "Create official game"}
      </button>
    </form>
  );
}
