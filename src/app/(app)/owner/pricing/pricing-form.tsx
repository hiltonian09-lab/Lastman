"use client";

import { useActionState } from "react";
import { updatePricingAction, type PricingFormState } from "./actions";

const initialState: PricingFormState = {};

export function PricingForm({
  defaultMinimum,
  defaultPerPlayer,
}: {
  defaultMinimum: string;
  defaultPerPlayer: string;
}) {
  const [state, formAction, pending] = useActionState(updatePricingAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Minimum fee (£)
          <input
            name="minimumFee"
            type="number"
            step="0.01"
            min={0}
            defaultValue={defaultMinimum}
            className="rounded-lg border border-border-glass bg-transparent px-3 py-2 outline-none focus:border-royal-blue"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Per-player fee (£)
          <input
            name="perPlayerFee"
            type="number"
            step="0.01"
            min={0}
            defaultValue={defaultPerPlayer}
            className="rounded-lg border border-border-glass bg-transparent px-3 py-2 outline-none focus:border-royal-blue"
          />
        </label>
      </div>

      {state.error && <p className="text-sm text-red-400">{state.error}</p>}
      {state.success && (
        <p className="text-sm text-status-alive">Updated — new games will use this pricing.</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-full bg-royal-blue px-5 py-2 text-sm font-medium text-white hover:bg-royal-blue-deep disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save pricing"}
      </button>
    </form>
  );
}
