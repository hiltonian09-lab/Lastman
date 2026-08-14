"use client";

import { useState, useTransition } from "react";
import { restartGameAction } from "../actions";

export function RestartGameButton({ slug }: { slug: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="self-start rounded-full border border-gold px-5 py-2 text-sm font-medium text-gold transition-colors hover:bg-gold/10"
      >
        Restart for a new season
      </button>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2 rounded-lg border border-gold p-4">
      <p className="text-sm">
        Everyone gets reset to active with full lives and a new round 1 starts.
        Past picks and results stay in the history — nothing is deleted.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => restartGameAction(slug))}
          className="rounded-full bg-gold px-4 py-2 text-sm font-medium text-black transition-colors hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Restarting…" : "Confirm restart"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="rounded-full border border-border-glass px-4 py-2 text-sm hover:bg-surface-glass"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
