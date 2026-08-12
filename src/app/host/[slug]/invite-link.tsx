"use client";

import { useState } from "react";

export function InviteLink({ code, origin }: { code: string; origin: string }) {
  const [copied, setCopied] = useState(false);
  const link = `${origin}/join?code=${code}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can be blocked (older browsers, insecure context) — the
      // link is still selectable/visible as plain text, so nothing is lost.
    }
  }

  return (
    <div className="glass-card p-4">
      <p className="text-xs uppercase tracking-wide text-foreground-muted">
        Invite link — share this with your players
      </p>
      <div className="mt-2 flex items-center gap-2">
        <input
          readOnly
          value={link}
          onFocus={(e) => e.currentTarget.select()}
          className="flex-1 truncate rounded-lg border border-border-glass bg-transparent px-3 py-2 text-sm text-gold outline-none"
        />
        <button
          type="button"
          onClick={copy}
          className="shrink-0 rounded-full bg-royal-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-royal-blue-deep"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <p className="mt-2 text-xs text-foreground-muted">
        Or share the code directly: <span className="text-gold">{code}</span>
      </p>
    </div>
  );
}
