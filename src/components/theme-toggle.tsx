"use client";

import { useEffect, useState } from "react";

type Theme = "dark" | "light";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [hasLoaded, setHasLoaded] = useState(false);

  // Load the stored preference once on mount, before anything is allowed to
  // write back to storage — otherwise the initial default ("dark") gets
  // persisted first and immediately clobbers whatever the user had chosen.
  useEffect(() => {
    const stored = localStorage.getItem("theme") as Theme | null;
    // Reading a persisted preference once on mount; localStorage isn't
    // available during SSR so this can't be a lazy useState initializer.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored) setTheme(stored);
    setHasLoaded(true);
  }, []);

  useEffect(() => {
    if (!hasLoaded) return;
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme, hasLoaded]);

  return (
    <button
      type="button"
      onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border-glass text-foreground-muted transition hover:border-gold"
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      aria-label="Toggle light/dark mode"
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
