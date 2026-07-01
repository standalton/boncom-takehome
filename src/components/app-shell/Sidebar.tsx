/**
 * Sidebar.tsx — primary navigation for the authenticated app.
 *
 * What:        Left nav (Dashboard, Quotes, Clients, Products), the current
 *              user, and a logout button.
 * Where used:  The (app) layout shell.
 * Notes:       Client component for active-link highlighting and the logout
 *              form action. The spreadsheet Import feature exists at /import but
 *              is intentionally not linked here (kept out of the demo path); see
 *              src/components/import and docs/superpowers/specs.
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FileText, Users, Package, LogOut } from "lucide-react";
import { signOut } from "@/actions/auth";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/quotes", label: "Quotes", icon: FileText },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/products", label: "Products", icon: Package },
];

export function Sidebar({ userName }: { userName: string }) {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r bg-sidebar">
      <div className="px-5 py-5">
        <Link
          href="/"
          className="rounded-md text-lg font-semibold text-primary outline-none transition-all duration-150 hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-[0.98]"
        >
          kwik-quote
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "press flex items-center gap-3 rounded-md px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset",
                active
                  ? "bg-accent font-medium text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t px-3 py-3">
        <div className="px-3 pb-2 text-sm font-medium text-foreground">{userName}</div>
        <form action={signOut}>
          <button
            type="submit"
            className="press flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset"
          >
            <LogOut className="size-4" />
            Log out
          </button>
        </form>
      </div>
    </aside>
  );
}
