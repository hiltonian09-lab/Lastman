"use client";

import { useActionState } from "react";
import { createGameAction, type HostFormState } from "../actions";
import { PrizeStructureFields } from "@/components/prize-structure-fields";
import { LeaguePicker } from "@/components/league-picker";
import type { LeagueRow } from "@/lib/db/leagues";

const initialState: HostFormState = {};

export function HostForm({
  leagues,
  minimumFeeCents,
}: {
  leagues: LeagueRow[];
  minimumFeeCents: number;
}) {
  const [state, formAction, pending] = useActionState(createGameAction, initialState);

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-6">
      <label className="flex flex-col gap-1 text-sm">
        Game name
        <input
          name="name"
          type="text"
          required
          placeholder="e.g. The Rovers Arms LMS"
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
          league&rsquo;s season hasn&rsquo;t started yet — round 1 will pick
          up fixtures from that gameweek instead.
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

      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Missed pick policy
          <select
            name="missedPickPolicy"
            defaultValue="lowest_alphabetical"
            className="rounded-lg border border-border-glass bg-transparent px-3 py-2 outline-none focus:border-royal-blue"
          >
            <option value="lowest_alphabetical">Auto-assign lowest alphabetical</option>
            <option value="bottom_of_league">Auto-assign bottom of the league</option>
            <option value="eliminate">Auto-eliminate</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Picks lock
          <select
            name="pickLockHoursBefore"
            defaultValue={1}
            className="rounded-lg border border-border-glass bg-transparent px-3 py-2 outline-none focus:border-royal-blue"
          >
            <option value={12}>12 hours before kickoff</option>
            <option value={9}>9 hours before kickoff</option>
            <option value={6}>6 hours before kickoff</option>
            <option value={3}>3 hours before kickoff</option>
            <option value={1}>1 hour before kickoff</option>
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Entry fee (display only)
          <input
            name="displayEntryFee"
            type="number"
            step="0.01"
            min={0}
            defaultValue="10.00"
            className="rounded-lg border border-border-glass bg-transparent px-3 py-2 outline-none focus:border-royal-blue"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Visibility
          <select
            name="visibility"
            defaultValue="invite_only"
            className="rounded-lg border border-border-glass bg-transparent px-3 py-2 outline-none focus:border-royal-blue"
          >
            <option value="invite_only">Invite only</option>
            <option value="public">Public</option>
          </select>
        </label>
      </div>

      <p className="text-xs text-foreground-muted">
        Entry fees and prizes are arranged directly between you and your
        players — the platform never collects or holds this money. The
        breakdown below is only visible to you, to help you see your margin
        after platform fees.
      </p>
      <PrizeStructureFields />

      {state.error && <p className="text-sm text-red-400">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-full bg-royal-blue px-4 py-3 font-medium text-white transition-colors hover:bg-royal-blue-deep disabled:opacity-60"
      >
        {pending
          ? "Setting up…"
          : `Continue to pay £${(minimumFeeCents / 100).toFixed(2)} admin fee`}
      </button>
    </form>
  );
}
