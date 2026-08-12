import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <Link
        href="/"
        className="mb-8 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight"
      >
        The Gauntlet
      </Link>
      <div className="glass-card w-full max-w-sm p-8">{children}</div>
    </div>
  );
}
