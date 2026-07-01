/**
 * Pagination.tsx — numbered page navigation for list pages.
 *
 * What:        Renders "X–Y of Z" plus Prev / numbered pages / Next. Each link
 *              preserves the current query string (e.g. ?q=) and only changes
 *              the page param, so search + paging compose.
 * Where used:  The quotes, clients, and products list pages.
 * Notes:       Client component so it can read the current path + params. Renders
 *              nothing when everything fits on a single page.
 */
"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PAGE_SIZE, pageCount, pageItems } from "@/lib/pagination";

type Props = { page: number; total: number; pageSize?: number };

export function Pagination({ page, total, pageSize = PAGE_SIZE }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const totalPages = pageCount(total, pageSize);

  if (totalPages <= 1) return null;

  const hrefForPage = (p: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", String(p));
    return `${pathname}?${params.toString()}`;
  };

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const items = pageItems(page, totalPages);

  const base =
    "inline-flex h-8 min-w-8 items-center justify-center rounded-lg border px-2 text-sm transition-colors";

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground tabular-nums">
        {from}–{to} of {total}
      </p>

      <nav className="flex items-center gap-1" aria-label="Pagination">
        {page > 1 ? (
          <Link href={hrefForPage(page - 1)} className={`${base} hover:bg-muted/50`} aria-label="Previous page">
            <ChevronLeft className="size-4" />
          </Link>
        ) : (
          <span className={`${base} cursor-not-allowed opacity-40`} aria-disabled>
            <ChevronLeft className="size-4" />
          </span>
        )}

        {items.map((item, i) =>
          item === "ellipsis" ? (
            <span key={`e${i}`} className="px-1 text-sm text-muted-foreground">
              …
            </span>
          ) : item === page ? (
            <span key={item} className={`${base} border-primary bg-primary text-primary-foreground`} aria-current="page">
              {item}
            </span>
          ) : (
            <Link key={item} href={hrefForPage(item)} className={`${base} hover:bg-muted/50`}>
              {item}
            </Link>
          ),
        )}

        {page < totalPages ? (
          <Link href={hrefForPage(page + 1)} className={`${base} hover:bg-muted/50`} aria-label="Next page">
            <ChevronRight className="size-4" />
          </Link>
        ) : (
          <span className={`${base} cursor-not-allowed opacity-40`} aria-disabled>
            <ChevronRight className="size-4" />
          </span>
        )}
      </nav>
    </div>
  );
}
