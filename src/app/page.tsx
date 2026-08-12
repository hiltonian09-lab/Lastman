import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between px-6 py-6 sm:px-12">
        <span className="font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight">
          The Gauntlet
        </span>
        <nav className="flex items-center gap-6 text-sm text-foreground-muted">
          <Link href="/games" className="hover:text-foreground">
            Browse games
          </Link>
          <Link href="/login" className="hover:text-foreground">
            Sign in
          </Link>
          <ThemeToggle />
          <Link
            href="/host/new"
            className="rounded-full bg-royal-blue px-4 py-2 font-medium text-white hover:bg-royal-blue-deep transition-colors"
          >
            Host a game
          </Link>
        </nav>
      </header>

      <main className="flex flex-1 flex-col items-center px-6 py-20 text-center sm:px-12">
        <span className="mb-6 rounded-full border border-border-glass bg-surface-glass px-4 py-1 text-xs font-medium tracking-wide text-gold uppercase">
          Premier League &middot; Championship &middot; and more
        </span>
        <h1 className="font-[family-name:var(--font-heading)] max-w-3xl text-5xl font-semibold leading-tight tracking-tight sm:text-6xl">
          Pick a team. Get it wrong,{" "}
          <span className="text-royal-blue">you&rsquo;re out.</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg text-foreground-muted">
          One team, one gameweek, no repeats. Survive the season and outlast
          everyone else in your league.
        </p>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <Link
            href="/join"
            className="rounded-full bg-royal-blue px-8 py-3 font-medium text-white hover:bg-royal-blue-deep transition-colors"
          >
            Join a game
          </Link>
          <Link
            href="/host/new"
            className="rounded-full border border-border-glass px-8 py-3 font-medium hover:bg-surface-glass transition-colors"
          >
            Host your own
          </Link>
        </div>

        <section className="mt-24 grid w-full max-w-4xl gap-6 sm:grid-cols-3">
          <div className="glass-card p-6 text-left">
            <div className="mb-3 h-2 w-2 rounded-full bg-status-alive" />
            <h3 className="font-[family-name:var(--font-heading)] text-lg font-medium">
              Next fixture
            </h3>
            <p className="mt-1 text-sm text-foreground-muted">
              Every gameweek&rsquo;s fixtures, front and centre, before your
              deadline hits.
            </p>
          </div>
          <div className="glass-card p-6 text-left">
            <div className="mb-3 h-2 w-2 rounded-full bg-gold" />
            <h3 className="font-[family-name:var(--font-heading)] text-lg font-medium">
              Host your own league
            </h3>
            <p className="mt-1 text-sm text-foreground-muted">
              Invite your mates with a code, set the rules, message the whole
              league at once.
            </p>
          </div>
          <div className="glass-card p-6 text-left">
            <div className="mb-3 h-2 w-2 rounded-full bg-status-pending" />
            <h3 className="font-[family-name:var(--font-heading)] text-lg font-medium">
              Multiple leagues
            </h3>
            <p className="mt-1 text-sm text-foreground-muted">
              Pick from any team across every league your game includes, not
              just one.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
