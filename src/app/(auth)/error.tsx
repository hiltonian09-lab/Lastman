"use client";

import { useEffect } from "react";
import { reportError } from "@/lib/error";

export default function AuthErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError(error);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <h2 className="font-[family-name:var(--font-heading)] text-2xl font-semibold">
        Something went wrong
      </h2>
      <p className="mt-2 text-sm text-foreground-muted">
        {error.message || "Please try again."}
      </p>
      <button
        onClick={() => reset()}
        className="mt-6 rounded-full bg-royal-blue px-6 py-3 text-sm font-medium text-white hover:bg-royal-blue-deep"
      >
        Try again
      </button>
    </div>
  );
}
