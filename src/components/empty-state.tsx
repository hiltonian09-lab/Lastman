export function EmptyState({
  title,
  description,
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="glass-card p-6 text-center">
      <div className="mx-auto mb-3 h-2 w-2 rounded-full bg-foreground-muted/50" />
      {title && <p className="font-medium">{title}</p>}
      {description && (
        <p className="mt-1 text-sm text-foreground-muted">{description}</p>
      )}
    </div>
  );
}
