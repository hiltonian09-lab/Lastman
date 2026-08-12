// Plain, inline-styled HTML — email clients strip most CSS, so this stays
// deliberately simple rather than trying to reproduce the app's full theme.

const WRAPPER_STYLE =
  "font-family: -apple-system, Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #10162c;";
const HEADER_STYLE = "color: #1B2A6B; font-size: 20px; font-weight: 600; margin-bottom: 16px;";
const BUTTON_STYLE =
  "display: inline-block; background: #2A3FCE; color: #ffffff; padding: 10px 20px; border-radius: 999px; text-decoration: none; font-weight: 500; margin-top: 16px;";

function wrap(title: string, body: string): string {
  return `<div style="${WRAPPER_STYLE}"><p style="${HEADER_STYLE}">${title}</p>${body}</div>`;
}

export function eliminationEmail(params: { gameName: string; teamName: string; gameUrl: string }) {
  return {
    subject: `You're out of ${params.gameName}`,
    html: wrap(
      "The Gauntlet",
      `<p>Your pick, <strong>${params.teamName}</strong>, didn't get the result you needed — you've been eliminated from <strong>${params.gameName}</strong>.</p>
       <p>Better luck in the next one. You can still follow how the rest of the league gets on.</p>
       <a href="${params.gameUrl}" style="${BUTTON_STYLE}">View standings</a>`,
    ),
  };
}

export function roundReminderEmail(params: {
  gameName: string;
  deadlineAt: string;
  gameUrl: string;
}) {
  const deadline = new Date(params.deadlineAt).toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  return {
    subject: `Pick reminder — ${params.gameName}`,
    html: wrap(
      "The Gauntlet",
      `<p>You haven't picked yet in <strong>${params.gameName}</strong>. Picks lock at <strong>${deadline}</strong>.</p>
       <p>Miss it and your pick gets auto-assigned (or you're eliminated, depending on this game's rules) — don't leave it to the last minute.</p>
       <a href="${params.gameUrl}" style="${BUTTON_STYLE}">Make your pick</a>`,
    ),
  };
}

export function broadcastEmail(params: {
  gameName: string;
  senderName: string;
  body: string;
  gameUrl: string;
}) {
  return {
    subject: `Message from ${params.senderName} — ${params.gameName}`,
    html: wrap(
      params.gameName,
      `<p style="white-space: pre-wrap;">${escapeHtml(params.body)}</p>
       <a href="${params.gameUrl}" style="${BUTTON_STYLE}">Open the game</a>`,
    ),
  };
}

export function gameBlockedEmail(params: { gameName: string; gameUrl: string }) {
  return {
    subject: `Action needed — ${params.gameName} is paused`,
    html: wrap(
      "Payment needs updating",
      `<p>The balance charge for <strong>${params.gameName}</strong> failed, so the game is paused for every player until it's resolved.</p>
       <p>Update your payment method to restore access — players keep their spots, nothing is lost.</p>
       <a href="${params.gameUrl}" style="${BUTTON_STYLE}">Resolve billing</a>`,
    ),
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
