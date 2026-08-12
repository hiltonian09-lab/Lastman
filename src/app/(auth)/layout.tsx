import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="mb-8 flex items-center gap-4">
        <Link
          href="/"
          className="font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight"
        >
          The Gauntlet
        </Link>
        <ThemeToggle />
      </div>
      <div className="glass-card w-full max-w-sm p-8">{children}</div>
    </div>
  );
}
