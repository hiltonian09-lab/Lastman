/**
 * For links inside emails sent from the cron worker, where there's no
 * incoming request to derive an origin from (unlike getOrigin(), which is
 * request-scoped and used for Stripe redirect URLs).
 */
export function getAppUrl(env: Env): string {
  return env.APP_URL || "http://localhost:3001";
}
