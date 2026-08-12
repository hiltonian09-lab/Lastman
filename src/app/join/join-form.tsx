"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { joinByCodeAction, type JoinFormState } from "./actions";

const initialState: JoinFormState = {};

export function JoinForm() {
  const [state, formAction, pending] = useActionState(joinByCodeAction, initialState);
  const searchParams = useSearchParams();
  const codeFromLink = searchParams.get("code")?.toUpperCase() ?? "";

  return (
    <>
      <p className="mt-1 text-center text-sm text-foreground-muted">
        {codeFromLink
          ? "Confirm the invite code below and join."
          : "Enter the invite code your organiser sent you."}
      </p>

      <form action={formAction} className="mt-6 flex w-full flex-col gap-4">
        <input
          name="code"
          type="text"
          required
          defaultValue={codeFromLink}
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
    </>
  );
}
