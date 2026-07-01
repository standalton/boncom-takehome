/**
 * list-params.ts — sort parsing/validation for the list pages.
 *
 * What:        Turns an untrusted ?sort=&dir= pair into a safe {column,
 *              ascending} spec (validated against a per-table allow-list) and
 *              applies it to a Supabase query. The trust boundary for sorting.
 * Where used:  The list pages (parse) and list server actions (apply) for
 *              quotes, clients, and products.
 * Notes:       Sibling of pagination.ts; same "parse untrusted URL value into a
 *              safe default" contract as parsePage. An unknown column falls back
 *              to the table default rather than throwing — a bad query param must
 *              not error the page (a safe default, not a swallowed error).
 */

export type SortSpec = { column: string; ascending: boolean };

// Allow-lists: the only columns a URL may sort by, per table. Every entry is a
// plain column on the base table (no joined/embedded columns — see the spec).
export const QUOTE_SORTS = ["number", "status", "total_cents", "updated_at"] as const;
export const PRODUCT_SORTS = ["name", "unit", "default_rate_cents"] as const;
export const CLIENT_SORTS = ["company", "contact_name", "email"] as const;

export const QUOTE_SORT_DEFAULT: SortSpec = { column: "updated_at", ascending: false };
export const PRODUCT_SORT_DEFAULT: SortSpec = { column: "name", ascending: true };
export const CLIENT_SORT_DEFAULT: SortSpec = { column: "company", ascending: true };

/**
 * Parse an untrusted ?sort=/?dir= pair into a safe SortSpec. Unknown columns
 * fall back to `fallback`; direction is ascending only when dir is exactly "asc".
 */
export function parseSort(
  rawSort: string | undefined,
  rawDir: string | undefined,
  allow: readonly string[],
  fallback: SortSpec,
): SortSpec {
  if (!rawSort || !allow.includes(rawSort)) return fallback;
  return { column: rawSort, ascending: rawDir === "asc" };
}

/** Apply a SortSpec to any Supabase-style query builder with an .order() method. */
export function applySort<Q extends { order(column: string, options: { ascending: boolean }): Q }>(
  query: Q,
  sort: SortSpec,
): Q {
  return query.order(sort.column, { ascending: sort.ascending });
}
