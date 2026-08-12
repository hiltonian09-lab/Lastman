/** Accepts either ISO ("...T...Z") or SQLite's datetime('now') format ("YYYY-MM-DD HH:MM:SS", UTC). */
export function formatRelativeTime(dateString: string): string {
  const isoLike = dateString.includes("T") ? dateString : `${dateString.replace(" ", "T")}Z`;
  const diffMs = Date.now() - new Date(isoLike).getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}
