// `.open-next/worker.js` only exists after a build, so `@ts-expect-error` would itself
// error whenever the file happens to be present — `@ts-ignore` is deliberate here.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { default as handler } from "./.open-next/worker.js";
import { runTick } from "./src/lib/engine/tick";

export default {
  fetch: handler.fetch,

  async scheduled(_event, env: Env) {
    const result = await runTick(env);
    console.log(
      `[cron] live scores synced: ${result.liveScoresSynced}, full schedule synced: ${result.fullScheduleSynced}, ` +
        `reminders sent: ${result.remindersSent}, rounds locked: ${result.roundsLocked}, resolution passes: ${result.roundsResolved}`,
    );
  },
} satisfies ExportedHandler<Env>;
