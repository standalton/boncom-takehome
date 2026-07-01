# List Sort & Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add URL-driven, server-side column sorting and facet filtering to the quotes, clients, and products list tables.

**Architecture:** State lives in the URL query string (`?sort=&dir=&status=&unit=`), mirroring the existing `?q=`/`?page=` pattern. A pure `list-params.ts` helper validates the untrusted `sort`/`dir` values against a per-table allow-list and applies `.order()` to the Supabase query. Two shared client components — `SortableHead` and `FilterSelect` — push URL changes (resetting `page` to 1). Only plain base-table columns are sortable; no joined-column sort.

**Tech Stack:** Next.js App Router (server components + server actions), Supabase query builder, shadcn/ui table + select, Vitest (unit), Playwright (E2E), `@tabler/icons-react`.

**Design spec:** `docs/superpowers/specs/2026-06-30-list-sort-filter-design.md`

---

## File structure

| File | Responsibility | Change |
| ---- | -------------- | ------ |
| `src/lib/list-params.ts` | Parse/validate `sort`+`dir`, apply sort to a query. Trust boundary. | Create |
| `src/lib/list-params.test.ts` | Unit tests for the above. | Create |
| `src/lib/quote-status.ts` | Add `QUOTE_STATUSES` + `isQuoteStatus` guard (derived from existing map). | Modify |
| `src/lib/quote-status.test.ts` | Test the new guard. | Create |
| `src/components/SortableHead.tsx` | Clickable sort header (shared). | Create |
| `src/components/FilterSelect.tsx` | Facet dropdown that sets a URL param (shared). | Create |
| `src/actions/quote-queries.ts` | `listQuotes` gains `sort` + `status` args. | Modify |
| `src/actions/products.ts` | `listProducts` gains `sort` + `unit` args. | Modify |
| `src/actions/clients.ts` | `listClients` gains `sort` arg. | Modify |
| `src/app/(app)/quotes/page.tsx` | Parse params, render FilterSelect + hidden inputs. | Modify |
| `src/app/(app)/products/page.tsx` | Same, plus SortableHead in the inline table. | Modify |
| `src/app/(app)/clients/page.tsx` | Parse sort param, pass through. | Modify |
| `src/components/QuoteList.tsx` | Sortable headers. | Modify |
| `src/components/ClientList.tsx` | Sortable headers. | Modify |
| `e2e/sort-filter.spec.ts` | E2E: sort a column, apply a filter. | Create |
| `docs/CONTEXT.md`, `docs/DECISIONS.md` | Map + decision entry. | Modify |

---

## Task 1: `list-params.ts` — the pure sort helper

**Files:**
- Create: `src/lib/list-params.ts`
- Test: `src/lib/list-params.test.ts`

- [ ] **Step 1: Write the failing test**

`src/lib/list-params.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  parseSort,
  applySort,
  QUOTE_SORTS,
  QUOTE_SORT_DEFAULT,
  type SortSpec,
} from "@/lib/list-params";

describe("parseSort", () => {
  it("returns the fallback when no sort is given", () => {
    expect(parseSort(undefined, undefined, QUOTE_SORTS, QUOTE_SORT_DEFAULT)).toEqual(
      QUOTE_SORT_DEFAULT,
    );
  });

  it("returns the fallback for a column not in the allow-list", () => {
    expect(parseSort("password", "asc", QUOTE_SORTS, QUOTE_SORT_DEFAULT)).toEqual(
      QUOTE_SORT_DEFAULT,
    );
  });

  it("accepts an allow-listed column with an explicit direction", () => {
    expect(parseSort("total_cents", "asc", QUOTE_SORTS, QUOTE_SORT_DEFAULT)).toEqual({
      column: "total_cents",
      ascending: true,
    });
  });

  it("treats any non-'asc' direction as descending", () => {
    expect(parseSort("number", "garbage", QUOTE_SORTS, QUOTE_SORT_DEFAULT)).toEqual({
      column: "number",
      ascending: false,
    });
  });
});

describe("applySort", () => {
  it("calls .order with the column and direction and returns the query", () => {
    const calls: Array<[string, { ascending: boolean }]> = [];
    const fakeQuery = {
      order(column: string, options: { ascending: boolean }) {
        calls.push([column, options]);
        return this;
      },
    };
    const sort: SortSpec = { column: "name", ascending: true };
    const result = applySort(fakeQuery, sort);
    expect(calls).toEqual([["name", { ascending: true }]]);
    expect(result).toBe(fakeQuery);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- list-params`
Expected: FAIL — cannot resolve `@/lib/list-params`.

- [ ] **Step 3: Write the implementation**

`src/lib/list-params.ts`:

```ts
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- list-params`
Expected: PASS (5 assertions across 2 suites).

- [ ] **Step 5: Commit**

```bash
git add src/lib/list-params.ts src/lib/list-params.test.ts
git commit -m "feat: add list-params sort helper with per-table allow-lists

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: `isQuoteStatus` guard (filter validation for quotes)

**Files:**
- Modify: `src/lib/quote-status.ts`
- Test: `src/lib/quote-status.test.ts`

- [ ] **Step 1: Write the failing test**

`src/lib/quote-status.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { QUOTE_STATUSES, isQuoteStatus } from "@/lib/quote-status";

describe("isQuoteStatus", () => {
  it("lists all six statuses", () => {
    expect([...QUOTE_STATUSES].sort()).toEqual(
      ["accepted", "declined", "draft", "finalized", "paid", "sent"].sort(),
    );
  });

  it("accepts a real status", () => {
    expect(isQuoteStatus("sent")).toBe(true);
  });

  it("rejects an unknown value", () => {
    expect(isQuoteStatus("deleted")).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- quote-status`
Expected: FAIL — `QUOTE_STATUSES`/`isQuoteStatus` not exported.

- [ ] **Step 3: Add the guard**

In `src/lib/quote-status.ts`, after the `STATUS_TRANSITIONS` declaration (around line 35), add:

```ts
// The closed set of statuses, derived from the transition map so it never drifts
// from the state machine. Used to validate an untrusted ?status= filter value.
export const QUOTE_STATUSES = Object.keys(STATUS_TRANSITIONS) as QuoteStatus[];

export function isQuoteStatus(value: string): value is QuoteStatus {
  return (QUOTE_STATUSES as string[]).includes(value);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- quote-status`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/quote-status.ts src/lib/quote-status.test.ts
git commit -m "feat: derive QUOTE_STATUSES + isQuoteStatus guard from the state machine

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: `SortableHead` component

**Files:**
- Create: `src/components/SortableHead.tsx`

- [ ] **Step 1: Write the component**

`src/components/SortableHead.tsx`:

```tsx
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
import { IconArrowUp, IconArrowDown, IconArrowsSort } from "@tabler/icons-react";
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

  const Icon = !active ? IconArrowsSort : currentAsc ? IconArrowUp : IconArrowDown;

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
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS (no errors). If `@tabler/icons-react` names differ, confirm `IconArrowUp`, `IconArrowDown`, `IconArrowsSort` exist (they are standard exports).

- [ ] **Step 3: Commit**

```bash
git add src/components/SortableHead.tsx
git commit -m "feat: add SortableHead URL-driven sort header component

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: `FilterSelect` component

**Files:**
- Create: `src/components/FilterSelect.tsx`

- [ ] **Step 1: Write the component**

`src/components/FilterSelect.tsx`:

```tsx
/**
 * FilterSelect.tsx — a URL-driven facet dropdown for list pages.
 *
 * What:        A shadcn Select that sets (or clears) a single query param and
 *              resets page to 1, preserving other params. "All" clears the param.
 * Where used:  The quotes page (status) and products page (unit).
 * Notes:       Client component (writes URL params). Options come from the
 *              caller's closed set so no filtering logic lives here.
 */
"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL = "__all__";

type Option = { value: string; label: string };
type Props = { param: string; options: Option[]; allLabel: string; className?: string };

export function FilterSelect({ param, options, allLabel, className }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = params.get(param) ?? ALL;

  function onChange(value: string) {
    const next = new URLSearchParams(params);
    if (value === ALL) next.delete(param);
    else next.set(param, value);
    next.set("page", "1");
    router.replace(`${pathname}?${next.toString()}`);
  }

  return (
    <Select value={current} onValueChange={onChange}>
      <SelectTrigger className={className} aria-label={allLabel}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS. Confirm `src/components/ui/select.tsx` exports `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue` (standard shadcn names).

- [ ] **Step 3: Commit**

```bash
git add src/components/FilterSelect.tsx
git commit -m "feat: add FilterSelect URL-driven facet dropdown

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Wire sorting + status filter into Quotes

**Files:**
- Modify: `src/actions/quote-queries.ts` (`listQuotes`)
- Modify: `src/components/QuoteList.tsx`
- Modify: `src/app/(app)/quotes/page.tsx`

- [ ] **Step 1: Extend `listQuotes`**

In `src/actions/quote-queries.ts`, add imports at the top:

```ts
import { applySort, QUOTE_SORT_DEFAULT, type SortSpec } from "@/lib/list-params";
import { isQuoteStatus } from "@/lib/quote-status";
```

Replace the current `listQuotes` body. The `.order(...)` moves out of the initial select into `applySort`, and a validated `.eq("status", …)` is added:

```ts
export async function listQuotes(
  search?: string,
  page?: number,
  sort: SortSpec = QUOTE_SORT_DEFAULT,
  status?: string,
) {
  const supabase = await createClient();
  let query = supabase
    .from("quotes")
    .select("*, clients(company, contact_name)", { count: "exact" });
  if (search && search.trim()) {
    query = query.ilike("number", `%${search.trim()}%`);
  }
  if (status && isQuoteStatus(status)) {
    query = query.eq("status", status);
  }
  query = applySort(query, sort);
  // A page number means "paginate"; its absence (e.g. the dashboard) means "all".
  if (page !== undefined) {
    const { from, to } = pageRange(page);
    query = query.range(from, to);
  }
  const { data, error, count } = await query;
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, data: data ?? [], count: count ?? (data?.length ?? 0) };
}
```

- [ ] **Step 2: Make the QuoteList headers sortable**

In `src/components/QuoteList.tsx`, add the import:

```tsx
import { SortableHead } from "@/components/SortableHead";
```

Replace the `<TableHeader>` block (the header `<TableRow>`) with:

```tsx
<TableHeader>
  <TableRow>
    <SortableHead column="number" label="Number" />
    <TableHead>Client</TableHead>
    <SortableHead column="status" label="Status" />
    <SortableHead column="total_cents" label="Total" align="right" firstDir="desc" />
    <SortableHead column="updated_at" label="Updated" firstDir="desc" />
    <TableHead className="w-10">
      <span className="sr-only">Actions</span>
    </TableHead>
  </TableRow>
</TableHeader>
```

(Client is intentionally not sortable — it is a joined column; see the spec.)

- [ ] **Step 3: Parse params + render the filter on the quotes page**

Replace `src/app/(app)/quotes/page.tsx` with:

```tsx
/**
 * quotes/page.tsx — the quotes list.
 *
 * What:        Full searchable, sortable, status-filterable list of quotes with
 *              a "New quote" action.
 * Where used:  The /quotes route (linked from the sidebar).
 */
import Link from "next/link";
import { Plus } from "lucide-react";
import { listQuotes } from "@/actions/quote-queries";
import { parsePage } from "@/lib/pagination";
import { parseSort, QUOTE_SORTS, QUOTE_SORT_DEFAULT } from "@/lib/list-params";
import { QUOTE_STATUSES } from "@/lib/quote-status";
import { statusMeta } from "@/components/StatusSelect";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FilterSelect } from "@/components/FilterSelect";
import { Pagination } from "@/components/Pagination";
import { QuoteList, type QuoteListRow } from "@/components/QuoteList";

const statusOptions = QUOTE_STATUSES.map((s) => ({ value: s, label: statusMeta[s].label }));

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    page?: string;
    sort?: string;
    dir?: string;
    status?: string;
  }>;
}) {
  const { q, page: pageParam, sort, dir, status } = await searchParams;
  const page = parsePage(pageParam);
  const sortSpec = parseSort(sort, dir, QUOTE_SORTS, QUOTE_SORT_DEFAULT);
  const res = await listQuotes(q, page, sortSpec, status);
  const quotes = (res.ok ? res.data : []) as unknown as QuoteListRow[];
  const total = res.ok ? res.count : 0;

  return (
    <div className="px-8 py-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-primary">Quotes</h1>
        <Link href="/quotes/new" className={buttonVariants({ size: "sm" })}>
          <Plus className="size-4" />
          New quote
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        {/* Hidden inputs keep an active sort/filter when a new search is submitted. */}
        <form className="max-w-xs flex-1">
          <Input name="q" defaultValue={q ?? ""} placeholder="Search by number…" />
          {sort && <input type="hidden" name="sort" value={sort} />}
          {dir && <input type="hidden" name="dir" value={dir} />}
          {status && <input type="hidden" name="status" value={status} />}
        </form>
        <FilterSelect
          param="status"
          options={statusOptions}
          allLabel="All statuses"
          className="w-44"
        />
      </div>

      {!res.ok ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          Could not load quotes: {res.error}
        </div>
      ) : quotes.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
          {q || status ? "No quotes match your search." : "No quotes yet. Create your first one."}
        </div>
      ) : (
        <>
          <QuoteList quotes={quotes} />
          <Pagination page={page} total={total} />
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Typecheck + unit tests**

Run: `npm run typecheck && npm test`
Expected: PASS. (The dashboard calls `listQuotes()` with no args; the new params default, so it is unaffected.)

- [ ] **Step 5: Commit**

```bash
git add src/actions/quote-queries.ts src/components/QuoteList.tsx "src/app/(app)/quotes/page.tsx"
git commit -m "feat: sortable columns + status filter on the quotes list

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Wire sorting + unit filter into Products

**Files:**
- Modify: `src/actions/products.ts` (`listProducts`)
- Modify: `src/app/(app)/products/page.tsx`

- [ ] **Step 1: Extend `listProducts`**

In `src/actions/products.ts`, add imports at the top:

```ts
import { applySort, PRODUCT_SORT_DEFAULT, type SortSpec } from "@/lib/list-params";
import { isProductUnit } from "@/lib/product-units";
```

Replace the `listProducts` body (remove the inline `.order("name")`, add validated unit filter + applySort):

```ts
export async function listProducts(
  search?: string,
  page?: number,
  sort: SortSpec = PRODUCT_SORT_DEFAULT,
  unit?: string,
) {
  const supabase = await createClient();
  let query = supabase
    .from("products")
    .select("*", { count: "exact" })
    .eq("active", true);
  const term = search?.trim();
  if (term) {
    // Strip characters that are delimiters in PostgREST's or() filter syntax so
    // the search term can't break (or inject into) the query.
    const safe = term.replace(/[,()]/g, " ");
    query = query.or(`name.ilike.%${safe}%,description.ilike.%${safe}%`);
  }
  if (unit && isProductUnit(unit)) {
    query = query.eq("unit", unit);
  }
  query = applySort(query, sort);
  if (page !== undefined) {
    const { from, to } = pageRange(page);
    query = query.range(from, to);
  }
  const { data, error, count } = await query;
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, data: data as Product[], count: count ?? data.length };
}
```

- [ ] **Step 2: Add SortableHead + unit filter to the products page**

In `src/app/(app)/products/page.tsx`, add imports:

```tsx
import { parseSort, PRODUCT_SORTS, PRODUCT_SORT_DEFAULT } from "@/lib/list-params";
import { PRODUCT_UNITS } from "@/lib/product-units";
import { FilterSelect } from "@/components/FilterSelect";
import { SortableHead } from "@/components/SortableHead";
```

Change the signature + parsing at the top of `ProductsPage`:

```tsx
export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; sort?: string; dir?: string; unit?: string }>;
}) {
  const { q, page: pageParam, sort, dir, unit } = await searchParams;
  const page = parsePage(pageParam);
  const sortSpec = parseSort(sort, dir, PRODUCT_SORTS, PRODUCT_SORT_DEFAULT);
  const res = await listProducts(q, page, sortSpec, unit);
  const products = res.ok ? res.data : [];
  const total = res.ok ? res.count : 0;
```

Replace the search `<form>` block with the search + filter row (hidden inputs preserve sort/unit):

```tsx
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <form className="max-w-xs flex-1">
          <Input name="q" defaultValue={q ?? ""} placeholder="Search by name or description…" />
          {sort && <input type="hidden" name="sort" value={sort} />}
          {dir && <input type="hidden" name="dir" value={dir} />}
          {unit && <input type="hidden" name="unit" value={unit} />}
        </form>
        <FilterSelect
          param="unit"
          options={PRODUCT_UNITS.map((u) => ({ value: u.value, label: u.label }))}
          allLabel="All units"
          className="w-44"
        />
      </div>
```

Replace the table's `<TableHeader>` block with sortable headers:

```tsx
            <TableHeader>
              <TableRow>
                <SortableHead column="name" label="Name" />
                <TableHead>Description</TableHead>
                <SortableHead column="unit" label="Unit" />
                <SortableHead
                  column="default_rate_cents"
                  label="Default rate"
                  align="right"
                  firstDir="desc"
                />
                <TableHead className="w-10" aria-label="Actions" />
              </TableRow>
            </TableHeader>
```

Update the empty-state copy so a filter with no matches reads correctly:

```tsx
            {q || unit
              ? "No products match your search."
              : "No products yet. Add the services you offer to reuse them in quotes."}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/actions/products.ts "src/app/(app)/products/page.tsx"
git commit -m "feat: sortable columns + unit filter on the products list

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Wire sorting into Clients

**Files:**
- Modify: `src/actions/clients.ts` (`listClients`)
- Modify: `src/components/ClientList.tsx`
- Modify: `src/app/(app)/clients/page.tsx`

- [ ] **Step 1: Extend `listClients`**

In `src/actions/clients.ts`, add the import:

```ts
import { applySort, CLIENT_SORT_DEFAULT, type SortSpec } from "@/lib/list-params";
```

Change the signature and remove the inline `.order("company")`, applying the sort after the search filter instead. Replace the opening of `listClients`:

```ts
export async function listClients(
  search?: string,
  page?: number,
  sort: SortSpec = CLIENT_SORT_DEFAULT,
) {
  const supabase = await createClient();
  let query = supabase.from("clients").select("*", { count: "exact" });
```

Then, immediately before the `if (page !== undefined) {` line near the end of the function, insert:

```ts
  query = applySort(query, sort);
```

(Leave the `.or(...)` search block and the quote-number matching untouched.)

- [ ] **Step 2: Make the ClientList headers sortable**

In `src/components/ClientList.tsx`, add the import:

```tsx
import { SortableHead } from "@/components/SortableHead";
```

Replace the header `<TableRow>` inside `<TableHeader>` with:

```tsx
          <TableRow>
            <SortableHead column="company" label="Company" />
            <SortableHead column="contact_name" label="Contact" />
            <SortableHead column="email" label="Email" />
            <TableHead>Phone</TableHead>
            <TableHead className="w-10" aria-label="Actions" />
          </TableRow>
```

(Phone is left unsorted — not in the allow-list; keep the column count at 5.)

- [ ] **Step 3: Parse the sort param on the clients page**

In `src/app/(app)/clients/page.tsx`, add the import:

```tsx
import { parseSort, CLIENT_SORTS, CLIENT_SORT_DEFAULT } from "@/lib/list-params";
```

Change the signature + parsing:

```tsx
export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; sort?: string; dir?: string }>;
}) {
  const { q, page: pageParam, sort, dir } = await searchParams;
  const page = parsePage(pageParam);
  const sortSpec = parseSort(sort, dir, CLIENT_SORTS, CLIENT_SORT_DEFAULT);
  const res = await listClients(q, page, sortSpec);
```

Add hidden inputs to the existing search `<form>` so a new search keeps the sort:

```tsx
      <form className="mb-4 max-w-md">
        <Input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search by company, contact, email, or quote #…"
        />
        {sort && <input type="hidden" name="sort" value={sort} />}
        {dir && <input type="hidden" name="dir" value={dir} />}
      </form>
```

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/actions/clients.ts src/components/ClientList.tsx "src/app/(app)/clients/page.tsx"
git commit -m "feat: sortable columns on the clients list

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: E2E test — sort a column and apply a filter

**Files:**
- Create: `e2e/sort-filter.spec.ts`

- [ ] **Step 1: Write the E2E spec**

`e2e/sort-filter.spec.ts` (mirrors the login pattern in `core-flow.spec.ts`; asserts on URL state + rendered rows, not on a specific data order, so it is seed-independent):

```ts
/**
 * sort-filter.spec.ts — sorting and filtering the quotes list.
 *
 * What:        Logs in, sorts the Total column, and applies a status filter,
 *              asserting the URL params update and the table still renders.
 * Notes:       Hits the live Supabase project + seeded demo users (like
 *              core-flow.spec.ts). Assumes at least one seeded quote exists.
 */
import { test, expect } from "@playwright/test";

test("sort and filter the quotes list via the URL", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Sarah", exact: true }).click();
  await expect(page).toHaveURL("http://localhost:3000/");

  await page.goto("/quotes");
  await expect(page.getByRole("table")).toBeVisible();

  // Sort by Total — clicking the header sets ?sort=total_cents.
  await page.getByRole("link", { name: /Sort by Total/i }).click();
  await expect(page).toHaveURL(/sort=total_cents/);
  await expect(page).toHaveURL(/dir=desc/);
  await expect(page.getByRole("table")).toBeVisible();

  // Clicking again flips the direction.
  await page.getByRole("link", { name: /Sort by Total/i }).click();
  await expect(page).toHaveURL(/dir=asc/);

  // Filter by status — pick "Sent".
  await page.getByRole("combobox", { name: /All statuses/i }).click();
  await page.getByRole("option", { name: "Sent", exact: true }).click();
  await expect(page).toHaveURL(/status=sent/);
  // Sort survives the filter change (params compose).
  await expect(page).toHaveURL(/sort=total_cents/);
});
```

- [ ] **Step 2: Run the E2E test**

Run: `npm run test:e2e -- sort-filter`
Expected: PASS. (Requires `.env.local` + seeded users + a running/ startable dev server, per `playwright.config.ts`.) If the Radix Select role differs, inspect with `npx playwright test --ui` and adjust the `combobox`/`option` selectors; the trigger has `aria-label="All statuses"`.

- [ ] **Step 3: Commit**

```bash
git add e2e/sort-filter.spec.ts
git commit -m "test: e2e coverage for quotes sort + status filter

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: Docs + full verification + code review

**Files:**
- Modify: `docs/CONTEXT.md`
- Modify: `docs/DECISIONS.md`

- [ ] **Step 1: Update the project map**

In `docs/CONTEXT.md`, add to the "Where do I look for...?" table:

```markdown
| List sort parsing/validation (?sort, ?dir) | `src/lib/list-params.ts` |
```

And add to the "Shared / reusable building blocks" table:

```markdown
| `parseSort` / `applySort` | `src/lib/list-params.ts` | Validate an untrusted sort param against a per-table allow-list; apply it to a Supabase query. |
| `SortableHead` | `src/components/SortableHead.tsx` | URL-driven sortable table header (arrow + toggle), preserves other params, resets page. |
| `FilterSelect` | `src/components/FilterSelect.tsx` | URL-driven facet dropdown (quotes: status, products: unit); "All" clears the param. |
| `QUOTE_STATUSES` / `isQuoteStatus` | `src/lib/quote-status.ts` | Closed status set + guard, derived from the transition map; validates the ?status filter. |
```

- [ ] **Step 2: Add the decision entry**

Append to `docs/DECISIONS.md`:

```markdown
## 2026-06-30 — List sorting and filtering are URL-driven and server-side

- **Decision:** Column sort + facet filters on the quotes/clients/products lists
  live in the URL query string (`?sort=&dir=&status=&unit=`) and are applied in
  the list server actions, mirroring the existing `?q=`/`?page=` pattern. Only
  plain base-table columns are sortable; joined columns (e.g. quotes by client
  company) are excluded.
- **Why:** URL state stays correct across server-side pagination (sorts/filters
  the whole result set, not just the current page), is shareable and refresh-safe,
  and reuses the established pattern instead of adding client state. Excluding
  joined-column sorts avoids the one query path (nullable embedded order) that
  behaves differently from every other column — disproportionate risk for the
  lowest-value sort.
- **Note:** A pure `lib/list-params.ts` validates the untrusted sort param against
  a per-table allow-list; status/unit filters reuse the existing closed sets
  (`QUOTE_STATUSES`, `isProductUnit`).
```

- [ ] **Step 3: Full verification**

Run: `npm run typecheck && npm test`
Expected: PASS (all unit tests, no type errors).

Run: `npm run test:e2e -- sort-filter`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add docs/CONTEXT.md docs/DECISIONS.md
git commit -m "docs: record list sort/filter in the map + decisions log

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 5: Code review (Definition of Done)**

Run `/code-review` (or dispatch the code-reviewer agent) over the branch diff. Address findings before considering the feature complete.

---

## Self-review notes

- **Spec coverage:** URL params (Tasks 5–7) · server-side + plain-columns-only (`applySort`, Task 1) · matrix Quotes/Products/Clients (Tasks 5/6/7) · status filter (Task 5) · unit filter (Task 6) · `SortableHead` (Task 3) · `FilterSelect` (Task 4) · param composition + page reset + hidden inputs (Tasks 3–7) · closed-set validation (`isQuoteStatus` Task 2, `isProductUnit` Task 6) · unit + E2E tests (Tasks 1/2/8) · docs (Task 9). All spec sections map to a task.
- **Type consistency:** `SortSpec`, `parseSort`, `applySort`, `QUOTE_SORTS`/`PRODUCT_SORTS`/`CLIENT_SORTS`, and the `*_SORT_DEFAULT` constants are defined once in Task 1 and used with identical names in Tasks 5–7. `isQuoteStatus`/`QUOTE_STATUSES` defined in Task 2, used in Tasks 5. `SortableHead`/`FilterSelect` prop shapes match every call site.
- **Behavior preserved:** default sorts equal today's ordering (quotes `updated_at` desc, products `name` asc, clients `company` asc), so nothing changes until a user acts. Dashboard's `listQuotes()` call is unaffected (new args default).
```
