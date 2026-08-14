"use client";

import { useActionState } from "react";
import { sendInviteEmailsAction, type InviteEmailFormState } from "../actions";

const initialState: InviteEmailFormState = {};

export function InviteEmailForm({ slug }: { slug: string }) {
  const action = sendInviteEmailsAction.bind(null, slug);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="glass-card flex flex-col gap-2 p-4">
      <p className="text-xs uppercase tracking-wide text-foreground-muted">
        Invite by email
      </p>
      <textarea
        name="emails"
        rows={2}
        placeholder="player1@example.com, player2@example.com"
        className="rounded-lg border border-border-glass bg-transparent px-3 py-2 text-sm outline-none focus:border-royal-blue"
      />
      <p className="text-xs text-foreground-muted">
        One per line or comma-separated, up to 30 at a time.
      </p>

      {state.error && <p className="text-sm text-red-400">{state.error}</p>}
      {state.success && <p className="text-sm text-status-alive">{state.success}</p>}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-full bg-royal-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-royal-blue-deep disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send invites"}
      </button>
    </form>
  );
}
