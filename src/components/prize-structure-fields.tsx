"use client";

import { useState } from "react";

export function PrizeStructureFields({
  defaultPrizeFundPercent = 75,
  defaultPrizePlaces = 1,
  defaultPrizeSplits = [100],
  defaultBoobyPrizePercent = 0,
}: {
  defaultPrizeFundPercent?: number;
  defaultPrizePlaces?: number;
  defaultPrizeSplits?: number[];
  defaultBoobyPrizePercent?: number;
}) {
  const [places, setPlaces] = useState(defaultPrizePlaces);
  const [splits, setSplits] = useState<number[]>(
    Array.from({ length: 3 }, (_, i) => defaultPrizeSplits[i] ?? 0),
  );
  const [boobyEnabled, setBoobyEnabled] = useState(defaultBoobyPrizePercent > 0);
  const [boobyPercent, setBoobyPercent] = useState(defaultBoobyPrizePercent);

  const activeSplits = splits.slice(0, places);
  const total = activeSplits.reduce((a, b) => a + b, 0) + (boobyEnabled ? boobyPercent : 0);
  const placeLabels = ["1st place", "2nd place", "3rd place"];

  return (
    <fieldset className="flex flex-col gap-3 rounded-lg border border-border-glass p-4">
      <legend className="px-1 text-sm font-medium">Prize structure</legend>

      <label className="flex flex-col gap-1 text-sm">
        Prize fund — % of the total pot paid out (rest is your margin)
        <input
          name="prizeFundPercent"
          type="number"
          min={0}
          max={100}
          defaultValue={defaultPrizeFundPercent}
          className="rounded-lg border border-border-glass bg-transparent px-3 py-2 outline-none focus:border-royal-blue"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Paid places
        <select
          name="prizePlaces"
          value={places}
          onChange={(e) => setPlaces(Number(e.target.value))}
          className="rounded-lg border border-border-glass bg-transparent px-3 py-2 outline-none focus:border-royal-blue"
        >
          <option value={1}>Top 1 (winner takes the prize fund)</option>
          <option value={2}>Top 2</option>
          <option value={3}>Top 3</option>
        </select>
      </label>

      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: places }, (_, i) => (
          <label key={i} className="flex flex-col gap-1 text-xs">
            {placeLabels[i]} %
            <input
              name={`prizeSplit${i + 1}`}
              type="number"
              min={0}
              max={100}
              value={splits[i]}
              onChange={(e) => {
                const next = [...splits];
                next[i] = Number(e.target.value);
                setSplits(next);
              }}
              className="rounded-lg border border-border-glass bg-transparent px-3 py-2 outline-none focus:border-royal-blue"
            />
          </label>
        ))}
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          name="boobyPrizeEnabled"
          type="checkbox"
          checked={boobyEnabled}
          onChange={(e) => setBoobyEnabled(e.target.checked)}
        />
        Include a booby prize (first player eliminated)
      </label>
      {boobyEnabled && (
        <label className="flex flex-col gap-1 text-xs">
          Booby prize %
          <input
            name="boobyPrizePercent"
            type="number"
            min={0}
            max={100}
            value={boobyPercent}
            onChange={(e) => setBoobyPercent(Number(e.target.value))}
            className="w-32 rounded-lg border border-border-glass bg-transparent px-3 py-2 outline-none focus:border-royal-blue"
          />
        </label>
      )}

      <p className={`text-xs ${total === 100 ? "text-status-alive" : "text-red-400"}`}>
        Places + booby prize: {total}% of the prize fund {total === 100 ? "✓" : "(must total 100%)"}
      </p>
    </fieldset>
  );
}
