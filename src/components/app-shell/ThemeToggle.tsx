/**
 * ThemeToggle.tsx — sidebar control that flips between light and dark themes.
 *
 * What:        Icon + label button (moon in light mode, sun in dark) that
 *              toggles the active theme via next-themes.
 * Where used:  Sidebar footer, above the current user's name.
 * Notes:       Theme is unknown during SSR, so it renders a fixed-height
 *              placeholder until mounted to avoid a hydration mismatch and
 *              layout shift. Row styling mirrors the other sidebar rows.
 */
"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Signal that we're past hydration so we can safely read the client-only
  // theme. This one-shot mount flag is the intended pattern here, not the
  // "derive state from props" case the lint rule targets.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  // Reserve the row's height before hydration so the footer doesn't jump.
  if (!mounted) {
    return <div className="h-9" aria-hidden />;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="press flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset"
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
      {isDark ? "Light mode" : "Dark mode"}
    </button>
  );
}
