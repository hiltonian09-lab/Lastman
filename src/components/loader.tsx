export function Loader() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-20">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-royal-blue border-t-transparent" />
      <p className="text-sm text-foreground-muted">Loading…</p>
    </div>
  );
}
