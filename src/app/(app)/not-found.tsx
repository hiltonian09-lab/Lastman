import Link from "next/link";
import { EmptyState } from "@/components/empty-state";

export default function AppNotFoundPage() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <EmptyState title="Page not found" description="That page doesn't exist." />
      <Link
        href="/dashboard"
        className="mt-6 rounded-full border border-border-glass px-6 py-3 text-sm hover:bg-surface-glass"
      >
        Go to dashboard
      </Link>
    </div>
  );
}
