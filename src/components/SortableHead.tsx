/**
 * SortableHead.tsx — a clickable, URL-driven sortable table header cell.
 *
 * What:        Drop-in replacement for <TableHead> on a sortable column. Renders
 *              the label + a direction arrow; clicking navigates to the same page
 *              with ?sort/?dir set (and page reset to 1), preserving other params.
 * Where used:  QuoteList, ClientList, and the products page table.
 * Notes:       Client component (reads/writes URL params). The `column` prop must
 *              match a value in the relevant allow-list in lib/list-params.ts.
 */
"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { TableHead } from "@/components/ui/table";

type Props = {
  column: string;
  label: string;
  align?: "left" | "right";
  /** Direction applied on the first click of an inactive column. */
  firstDir?: "asc" | "desc";
};

export function SortableHead({ column, label, align = "left", firstDir = "asc" }: Props) {
  const pathname = usePathname();
  const params = useSearchParams();

  const active = params.get("sort") === column;
  // Matches parseSort: any non-"asc" direction reads as descending.
  const currentAsc = params.get("dir") === "asc";
  const nextDir = active ? (currentAsc ? "desc" : "asc") : firstDir;

  const next = new URLSearchParams(params);
  next.set("sort", column);
  next.set("dir", nextDir);
  next.set("page", "1");

  const Icon = !active ? ArrowUpDown : currentAsc ? ArrowUp : ArrowDown;

  return (
    <TableHead className={align === "right" ? "text-right" : undefined}>
      <Link
        href={`${pathname}?${next.toString()}`}
        aria-label={`Sort by ${label}, ${nextDir === "asc" ? "ascending" : "descending"}`}
        className={`inline-flex items-center gap-1 transition-colors hover:text-foreground ${
          align === "right" ? "flex-row-reverse" : ""
        } ${active ? "font-medium text-foreground" : ""}`}
      >
        {label}
        <Icon className={`size-3.5 ${active ? "opacity-100" : "opacity-40"}`} aria-hidden />
      </Link>
    </TableHead>
  );
}
