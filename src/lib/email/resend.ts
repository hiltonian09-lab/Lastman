import { getEnv } from "@/lib/cloudflare";

/**
 * Thin wrapper over Resend's REST API (no SDK — keeps this edge-friendly and
 * usable from both request context and the cron worker via an explicit env).
 *
 * No-ops safely if RESEND_API_KEY isn't set, so nothing breaks in dev before
 * a domain/key exists — it just skips sending and logs why.
 */
export async function sendEmail(
  params: { to: string; subject: string; html: string },
  env?: Env,
): Promise<void> {
  const e = env ?? (await getEnv());

  if (!e.RESEND_API_KEY) {
    console.log(`[email] RESEND_API_KEY not set — skipped "${params.subject}" to ${params.to}`);
    return;
  }

  const from = e.EMAIL_FROM || "The Gauntlet <onboarding@resend.dev>";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${e.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
    }),
  });

  if (!res.ok) {
    // Never let a failed email take down a cron tick or a request — log and move on.
    console.error(`[email] Resend request failed: ${res.status} ${await res.text()}`);
  }
}
