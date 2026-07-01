/**
 * pagination.ts — shared pagination constants and helpers.
 *
 * What:        Page size, URL page-param parsing, Supabase range math, and the
 *              "1 … 4 5 6 … 20" page-number window used by the Pagination UI.
 * Where used:  List server actions (quote-queries, clients, products) and the
 *              Pagination component.
 */

export const PAGE_SIZE = 25;

/** Parse an untrusted ?page= value into a 1-based page (defaults to 1). */
export function parsePage(raw?: string): number {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

/** Inclusive Supabase .range() bounds for a 1-based page. */
export function pageRange(page: number, size = PAGE_SIZE) {
  const from = (page - 1) * size;
  return { from, to: from + size - 1 };
}

export function pageCount(total: number, size = PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / size));
}

/**
 * The page numbers to render, collapsing long runs with "ellipsis" markers.
 * Always includes the first and last page and a window around the current one.
 */
export function pageItems(current: number, totalPages: number): (number | "ellipsis")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const items: (number | "ellipsis")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(totalPages - 1, current + 1);
  if (start > 2) items.push("ellipsis");
  for (let p = start; p <= end; p++) items.push(p);
  if (end < totalPages - 1) items.push("ellipsis");
  items.push(totalPages);
  return items;
}
