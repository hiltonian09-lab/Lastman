export interface ErrorContext {
  [key: string]: unknown;
}

export function reportError(error: unknown, context?: ErrorContext): void {
  const normalized =
    error instanceof Error ? error : new Error(String(error ?? "Unknown error"));

  console.error(
    JSON.stringify({
      level: "error",
      message: normalized.message,
      stack: normalized.stack,
      context,
    }),
  );
}

export function reportWarning(message: string, context?: ErrorContext): void {
  console.warn(JSON.stringify({ level: "warning", message, context }));
}
