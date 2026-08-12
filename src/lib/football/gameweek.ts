/**
 * A "gameweek" for pick purposes spans Friday 00:00 UTC through Monday 23:59 UTC —
 * the standard football fixture congestion window. If we're currently inside
 * that window, it's the current gameweek; otherwise it's the upcoming one.
 */
export function getGameweekWindow(from: Date = new Date()): { from: Date; to: Date } {
  const day = from.getUTCDay(); // Sun=0 ... Sat=6
  const daysSinceFriday = (day - 5 + 7) % 7; // Fri=0, Sat=1, Sun=2, Mon=3, Tue=4, Wed=5, Thu=6

  const anchor = new Date(
    Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()),
  );

  if (daysSinceFriday <= 3) {
    anchor.setUTCDate(anchor.getUTCDate() - daysSinceFriday);
  } else {
    anchor.setUTCDate(anchor.getUTCDate() + (7 - daysSinceFriday));
  }

  const to = new Date(anchor);
  to.setUTCDate(to.getUTCDate() + 3);
  to.setUTCHours(23, 59, 59, 999);

  return { from: anchor, to };
}

export function toDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}
