"use client";

import { useActionState } from "react";
import { joinByCodeAction, type JoinFormState } from "./actions";

const initialState: JoinFormState = {};

export default function JoinPage() {
  const [state, formAction, pending] = useActionState(joinByCodeAction, initialState);

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center px-6 py-16">
      <h1 className="font-[family-name:var(--font-heading)] text-2xl font-semibold">
        Join a game
      </h1>
      <p className="mt-1 text-center text-sm text-foreground-muted">
        Enter the invite code your organiser sent you.
      </p>

      <form action={formAction} className="mt-6 flex w-full flex-col gap-4">
        <input
          name="code"
          type="text"
          required
          placeholder="LMS-XXXXXX"
          className="rounded-lg border border-border-glass bg-transparent px-3 py-2 text-center uppercase tracking-wider outline-none focus:border-royal-blue"
        />

        {state.error && (
          <p className="text-center text-sm text-red-400">{state.error}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-royal-blue px-4 py-2 font-medium text-white transition-colors hover:bg-royal-blue-deep disabled:opacity-60"
        >
          {pending ? "Joining…" : "Join game"}
        </button>
      </form>
    </div>
  );
}
