import type { LeagueRow } from "@/lib/db/leagues";

export function LeaguePicker({
  leagues,
  currentLeagueId,
  locked,
}: {
  leagues: LeagueRow[];
  currentLeagueId?: string;
  locked?: boolean;
}) {
  return (
    <fieldset className="flex flex-col gap-2" disabled={locked}>
      <legend className="mb-1 text-sm font-medium">
        League {locked && "(locked once round 1 starts)"}
      </legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {leagues.map((league) => (
          <label
            key={league.id}
            className={`flex cursor-pointer items-center justify-center rounded-full border border-border-glass px-3 py-2 text-center text-sm transition-colors has-checked:border-royal-blue has-checked:bg-royal-blue has-checked:text-white hover:bg-surface-glass ${locked ? "opacity-50" : ""}`}
          >
            <input
              type="radio"
              name="leagueId"
              value={league.id}
              defaultChecked={league.id === currentLeagueId}
              required
              className="sr-only"
            />
            {league.name}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
