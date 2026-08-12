"use client";

import { useActionState } from "react";
import { createGameAction, type HostFormState } from "../actions";
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

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">Leagues to pick from</legend>
        <div className="grid grid-cols-2 gap-2">
          {leagues.map((league) => (
            <label
              key={league.id}
              className="flex items-center gap-2 rounded-lg border border-border-glass px-3 py-2 text-sm has-checked:border-royal-blue"
            >
              <input type="checkbox" name="leagueIds" value={league.id} />
              {league.name}
            </label>
          ))}
        </div>
      </fieldset>

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

      <label className="flex flex-col gap-1 text-sm">
        Missed pick policy
        <select
          name="missedPickPolicy"
          defaultValue="lowest_alphabetical"
          className="rounded-lg border border-border-glass bg-transparent px-3 py-2 outline-none focus:border-royal-blue"
        >
          <option value="lowest_alphabetical">
            Auto-assign lowest alphabetical unused team
          </option>
          <option value="eliminate">Auto-eliminate</option>
        </select>
      </label>

      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Entry fee (display only — optional)
          <input
            name="displayEntryFee"
            type="number"
            step="0.01"
            min={0}
            placeholder="e.g. 10.00"
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

      <label className="flex flex-col gap-1 text-sm">
        Prize pool note (display only — optional)
        <input
          name="displayPrizePoolNote"
          type="text"
          placeholder="e.g. Winner takes the pot, paid by me directly"
          className="rounded-lg border border-border-glass bg-transparent px-3 py-2 outline-none focus:border-royal-blue"
        />
      </label>

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
