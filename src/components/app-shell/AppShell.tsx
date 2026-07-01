/**
 * AppShell.tsx — responsive authenticated shell (nav + content).
 *
 * What:        Docks the Sidebar on desktop (md+). On mobile it hides the
 *              sidebar behind a top bar with a hamburger that opens the same
 *              Sidebar as a slide-in drawer (backdrop, Escape, and route change
 *              all close it). The main content column scrolls independently.
 * Where used:  Wraps children in `src/app/(app)/layout.tsx`.
 * Notes:       Client component — it owns the drawer open/close state. The
 *              server layout stays responsible for the auth gate and passes the
 *              resolved userName in.
 */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Sidebar } from "./Sidebar";

export function AppShell({
  userName,
  children,
}: {
  userName: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  // Escape closes the drawer; lock body scroll while it's open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop: docked sidebar. */}
      <Sidebar userName={userName} className="hidden md:flex" />

      {/* Mobile: slide-in drawer + backdrop. */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-foreground/40 animate-in fade-in"
            onClick={() => setOpen(false)}
          />
          {/* Close when a nav link inside the drawer is tapped (not the theme
              toggle); logout redirects away on its own. */}
          <div
            onClick={(e) => {
              if ((e.target as HTMLElement).closest("a")) setOpen(false);
            }}
          >
            <Sidebar
              userName={userName}
              className="absolute inset-y-0 left-0 w-64 shadow-xl animate-in slide-in-from-left"
            />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile: top bar with the menu trigger. */}
        <header className="flex items-center gap-3 border-b px-4 py-3 md:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
            aria-expanded={open}
            className="press -ml-1 rounded-md p-1.5 text-muted-foreground outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <Menu className="size-5" />
          </button>
          <Link href="/" className="text-lg font-semibold text-primary">
            kwik-quote
          </Link>
        </header>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
