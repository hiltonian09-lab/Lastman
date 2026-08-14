import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { logoutAction } from "@/app/(auth)/actions";
import { ThemeToggle } from "@/components/theme-toggle";
import { MobileNav } from "@/components/mobile-nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-border-glass px-4 py-4 sm:px-6">
        <Link
          href={user ? "/dashboard" : "/"}
          className="font-[family-name:var(--font-heading)] shrink-0 text-lg font-semibold tracking-tight"
        >
          The Gauntlet
        </Link>

        <nav className="hidden items-center gap-4 text-sm text-foreground-muted sm:flex">
          <Link href="/games" className="hover:text-foreground">
            Browse games
          </Link>
          <Link href="/leagues" className="hover:text-foreground">
            Leagues
          </Link>
          <ThemeToggle />
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

        <div className="flex items-center gap-2 sm:hidden">
          <ThemeToggle />
          <MobileNav>
            <Link href="/games" className="rounded-md px-2 py-2 hover:bg-surface-glass">
              Browse games
            </Link>
            <Link href="/leagues" className="rounded-md px-2 py-2 hover:bg-surface-glass">
              Leagues
            </Link>
            {user ? (
              <>
                {user.role === "platform_owner" && (
                  <Link
                    href="/owner"
                    className="rounded-md px-2 py-2 text-gold hover:bg-surface-glass"
                  >
                    Owner console
                  </Link>
                )}
                <Link href="/feedback" className="rounded-md px-2 py-2 hover:bg-surface-glass">
                  Feedback
                </Link>
                <form action={logoutAction}>
                  <button
                    type="submit"
                    className="w-full rounded-md px-2 py-2 text-left hover:bg-surface-glass"
                  >
                    Sign out
                  </button>
                </form>
              </>
            ) : (
              <Link href="/login" className="rounded-md px-2 py-2 hover:bg-surface-glass">
                Sign in
              </Link>
            )}
          </MobileNav>
        </div>
      </header>
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
