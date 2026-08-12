import type { RoundRow } from "@/lib/db/rounds";
import { getGameById } from "@/lib/db/games";
import { sendEmail } from "@/lib/email/resend";
import { roundReminderEmail } from "@/lib/email/templates";
import { getAppUrl } from "@/lib/http/app-url";
import { getActiveEntriesWithoutPick, getUserContactById, markReminderSent } from "./queries";

/** Emails anyone who hasn't picked yet as a round's deadline approaches. Fires once per round. */
export async function sendRoundReminder(env: Env, round: RoundRow): Promise<void> {
  const game = await getGameById(round.game_id, env);
  if (!game) return;

  const entries = await getActiveEntriesWithoutPick(env, round.game_id, round.id);
  const gameUrl = `${getAppUrl(env)}/games/${game.slug}`;

  for (const entry of entries) {
    const contact = await getUserContactById(env, entry.user_id);
    if (!contact) continue;

    const { subject, html } = roundReminderEmail({
      gameName: game.name,
      deadlineAt: round.deadline_at,
      gameUrl,
    });
    await sendEmail({ to: contact.email, subject, html }, env);
  }

  await markReminderSent(env, round.id);
}
