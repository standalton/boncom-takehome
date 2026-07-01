/**
 * Sidebar.tsx — primary navigation for the authenticated app.
 *
 * What:        Left nav (Dashboard, Quotes, Clients, Products, Import), the
 *              current user, and a logout button.
 * Where used:  The (app) layout shell.
 * Notes:       Client component for active-link highlighting and the logout
 *              form action.
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FileText, Users, Package, Upload, LogOut } from "lucide-react";
import { signOut } from "@/actions/auth";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/quotes", label: "Quotes", icon: FileText },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/products", label: "Products", icon: Package },
  { href: "/import", label: "Import", icon: Upload },
];

export function Sidebar({ userName }: { userName: string }) {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r bg-sidebar">
      <div className="px-5 py-5">
        <Link href="/" className="text-lg font-semibold text-primary">
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
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
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
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <LogOut className="size-4" />
            Log out
          </button>
        </form>
      </div>
    </aside>
  );
}
