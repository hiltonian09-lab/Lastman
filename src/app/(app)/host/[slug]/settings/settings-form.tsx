"use client";

import { useActionState } from "react";
import { updateSettingsAction, type SettingsFormState } from "./actions";
import { PrizeStructureFields } from "@/components/prize-structure-fields";
import { LeaguePicker } from "@/components/league-picker";
import { LogoUploadField } from "@/components/logo-upload-field";
import type { LeagueRow } from "@/lib/db/leagues";

const initialState: SettingsFormState = {};

export function SettingsForm({
  slug,
  leagues,
  currentName,
  currentLeagueId,
  leaguesLocked,
  currentMaxPlayers,
  currentMissedPickPolicy,
  currentDisplayEntryFee,
  currentVisibility,
  isOfficial,
  currentStartsAt,
  currentPrizeFundPercent,
  currentPrizePlaces,
  currentPrizeSplits,
  currentBoobyPrizePercent,
  currentLogoDataUrl,
}: {
  slug: string;
  leagues: LeagueRow[];
  currentName: string;
  currentLeagueId: string;
  leaguesLocked: boolean;
  currentMaxPlayers: number | null;
  currentMissedPickPolicy: string;
  currentDisplayEntryFee: string;
  currentVisibility: string;
  isOfficial: boolean;
  currentStartsAt: string;
  currentPrizeFundPercent: number;
  currentPrizePlaces: number;
  currentPrizeSplits: number[];
  currentBoobyPrizePercent: number;
  currentLogoDataUrl: string | null;
}) {
  const action = updateSettingsAction.bind(null, slug);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <label className="flex flex-col gap-1 text-sm">
        Game name
        <input
          name="name"
          type="text"
          required
          defaultValue={currentName}
          className="rounded-lg border border-border-glass bg-transparent px-3 py-2 outline-none focus:border-royal-blue"
        />
      </label>

      <LogoUploadField currentLogoDataUrl={currentLogoDataUrl} />

      <LeaguePicker leagues={leagues} currentLeagueId={currentLeagueId} locked={leaguesLocked} />

      <label className="flex flex-col gap-1 text-sm">
        Round 1 start date {leaguesLocked && "(locked once round 1 starts)"}
        <input
          name="startsAt"
          type="date"
          defaultValue={currentStartsAt}
          disabled={leaguesLocked}
          className="rounded-lg border border-border-glass bg-transparent px-3 py-2 outline-none focus:border-royal-blue disabled:opacity-50"
        />
        <span className="text-xs text-foreground-muted">
          Leave blank to use the nearest upcoming fixtures. Set this if the
          league&rsquo;s season hasn&rsquo;t started yet.
        </span>
      </label>

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
        <>
          <p className="text-xs text-foreground-muted">
            Only visible to you — helps you see your margin after platform
            fees. Players see the entry fee and prize breakdown, not your
            profit.
          </p>
          <PrizeStructureFields
            defaultPrizeFundPercent={currentPrizeFundPercent}
            defaultPrizePlaces={currentPrizePlaces}
            defaultPrizeSplits={currentPrizeSplits}
            defaultBoobyPrizePercent={currentBoobyPrizePercent}
          />
        </>
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
