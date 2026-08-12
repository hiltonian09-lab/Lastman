"use client";

import { useActionState, useRef, useEffect } from "react";
import { submitFeedbackAction, type FeedbackFormState } from "./actions";

const initialState: FeedbackFormState = {};

export function FeedbackForm() {
  const [state, formAction, pending] = useActionState(submitFeedbackAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      <textarea
        name="message"
        required
        rows={5}
        placeholder="What's on your mind?"
        className="rounded-lg border border-border-glass bg-transparent px-3 py-2 text-sm outline-none focus:border-royal-blue"
      />
      {state.error && <p className="text-sm text-red-400">{state.error}</p>}
      {state.success && (
        <p className="text-sm text-status-alive">Thanks — that&rsquo;s been sent.</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-full bg-royal-blue px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-royal-blue-deep disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send feedback"}
      </button>
    </form>
  );
}
