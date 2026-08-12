"use client";

import { useActionState } from "react";
import { updateSettingsAction, type SettingsFormState } from "./actions";
import type { LeagueRow } from "@/lib/db/leagues";

const initialState: SettingsFormState = {};

export function SettingsForm({
  slug,
  leagues,
  currentLeagueIds,
  leaguesLocked,
  currentMaxPlayers,
  currentMissedPickPolicy,
  currentDisplayEntryFee,
  currentPrizePoolNote,
  currentVisibility,
  isOfficial,
}: {
  slug: string;
  leagues: LeagueRow[];
  currentLeagueIds: string[];
  leaguesLocked: boolean;
  currentMaxPlayers: number | null;
  currentMissedPickPolicy: string;
  currentDisplayEntryFee: string;
  currentPrizePoolNote: string;
  currentVisibility: string;
  isOfficial: boolean;
}) {
  const action = updateSettingsAction.bind(null, slug);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-2" disabled={leaguesLocked}>
        <legend className="mb-1 text-sm font-medium">
          Leagues to pick from {leaguesLocked && "(locked once round 1 starts)"}
        </legend>
        <div className="grid grid-cols-2 gap-2">
          {leagues.map((league) => (
            <label
              key={league.id}
              className={`flex items-center gap-2 rounded-lg border border-border-glass px-3 py-2 text-sm has-checked:border-royal-blue ${leaguesLocked ? "opacity-50" : ""}`}
            >
              <input
                type="checkbox"
                name="leagueIds"
                value={league.id}
                defaultChecked={currentLeagueIds.includes(league.id)}
              />
              {league.name}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Max players
          <input
            name="maxPlayers"
            type="number"
            min={2}
            defaultValue={currentMaxPlayers ?? ""}
            placeholder="Unlimited"
            className="rounded-lg border border-border-glass bg-transparent px-3 py-2 outline-none focus:border-royal-blue"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Missed pick policy
          <select
            name="missedPickPolicy"
            defaultValue={currentMissedPickPolicy}
            className="rounded-lg border border-border-glass bg-transparent px-3 py-2 outline-none focus:border-royal-blue"
          >
            <option value="lowest_alphabetical">Auto-assign lowest alphabetical</option>
            <option value="eliminate">Auto-eliminate</option>
          </select>
        </label>
      </div>

      {!isOfficial && (
        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1 text-sm">
            Entry fee (display only)
            <input
              name="displayEntryFee"
              type="number"
              step="0.01"
              min={0}
              defaultValue={currentDisplayEntryFee}
              placeholder="e.g. 10.00"
              className="rounded-lg border border-border-glass bg-transparent px-3 py-2 outline-none focus:border-royal-blue"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Visibility
            <select
              name="visibility"
              defaultValue={currentVisibility}
              className="rounded-lg border border-border-glass bg-transparent px-3 py-2 outline-none focus:border-royal-blue"
            >
              <option value="invite_only">Invite only</option>
              <option value="public">Public</option>
            </select>
          </label>
        </div>
      )}

      {!isOfficial && (
        <label className="flex flex-col gap-1 text-sm">
          Prize pool note (display only)
          <input
            name="displayPrizePoolNote"
            type="text"
            defaultValue={currentPrizePoolNote}
            className="rounded-lg border border-border-glass bg-transparent px-3 py-2 outline-none focus:border-royal-blue"
          />
        </label>
      )}

      {state.error && <p className="text-sm text-red-400">{state.error}</p>}
      {state.success && (
        <p className="text-sm text-status-alive">Settings saved.</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-full bg-royal-blue px-6 py-3 font-medium text-white transition-colors hover:bg-royal-blue-deep disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}
