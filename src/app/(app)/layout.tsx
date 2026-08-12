import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { logoutAction } from "@/app/(auth)/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-border-glass px-6 py-4">
        <Link
          href={user ? "/dashboard" : "/"}
          className="font-[family-name:var(--font-heading)] text-lg font-semibold tracking-tight"
        >
          The Gauntlet
        </Link>
        <nav className="flex items-center gap-4 text-sm text-foreground-muted">
          <Link href="/games" className="hover:text-foreground">
            Browse games
          </Link>
          {user ? (
            <>
              {user.role === "platform_owner" && (
                <Link href="/owner" className="text-gold hover:opacity-80">
                  Owner console
                </Link>
              )}
              <Link href="/feedback" className="hover:text-foreground">
                Feedback
              </Link>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="rounded-full border border-border-glass px-4 py-2 hover:bg-surface-glass"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-royal-blue px-4 py-2 font-medium text-white hover:bg-royal-blue-deep"
            >
              Sign in
            </Link>
          )}
        </nav>
      </header>
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
