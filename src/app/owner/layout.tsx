import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "platform_owner") redirect("/dashboard");

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-16">
      <div className="flex items-center justify-between">
        <span className="font-[family-name:var(--font-heading)] text-xl font-semibold">
          Owner console
        </span>
        <nav className="flex items-center gap-4 text-sm text-foreground-muted">
          <Link href="/owner" className="hover:text-foreground">
            Overview
          </Link>
          <Link href="/owner/pricing" className="hover:text-foreground">
            Pricing
          </Link>
          <Link href="/owner/games/new" className="hover:text-foreground">
            New official game
          </Link>
          <Link href="/owner/users" className="hover:text-foreground">
            Users
          </Link>
        </nav>
      </div>
      <div className="mt-8">{children}</div>
    </div>
  );
}
