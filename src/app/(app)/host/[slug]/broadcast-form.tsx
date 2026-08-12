"use client";

import { useActionState, useRef, useEffect } from "react";
import { sendBroadcastAction, type BroadcastFormState } from "../actions";

const initialState: BroadcastFormState = {};

export function BroadcastForm({ slug }: { slug: string }) {
  const action = sendBroadcastAction.bind(null, slug);
  const [state, formAction, pending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-2">
      <textarea
        name="body"
        required
        rows={2}
        placeholder="Message your whole league — e.g. picks lock Friday 6pm"
        className="rounded-lg border border-border-glass bg-transparent px-3 py-2 text-sm outline-none focus:border-royal-blue"
      />
      {state.error && <p className="text-sm text-red-400">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-full bg-royal-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-royal-blue-deep disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send to everyone"}
      </button>
    </form>
  );
}
