# List Sort & Filter — Design

Date: 2026-06-30
Status: Approved for planning

## Problem

The three list surfaces — `/quotes`, `/clients`, `/products` — support search and
server-side pagination but no way to sort by a column or filter by an obvious
facet (quote status, product unit). Users scanning for "the biggest open quote"
or "everything still in draft" have to page through manually.

## Goal

Add column **sorting** and targeted **filtering** to all three list tables,
built on the patterns already in the codebase, with no special-case query paths.

## Non-goals

- Sorting by a **joined/embedded** column (e.g. quotes by client company). Only
  plain base-table columns get a sort in v1 — see "Key decision" below.
- Free-text column filters (company/contact/email are already covered by search).
- Multi-column / secondary sort. One active sort at a time.
- Any client-side-only sorting or filtering.

## Key decision: URL-driven, server-side, plain columns only

State lives in the **URL query string**, exactly like the existing `?q=` and
`?page=`. This keeps sort/filter server-side (so it is correct across the whole
result set, not just the current 25-row page), shareable, bookmarkable, and
refresh-safe. It reuses the existing pattern rather than introducing React state.

**Only columns sortable by a plain `.order("col")` on the base query get a sort
control.** A column that would require ordering an embedded to-one join
(`referencedTable`) is excluded in v1: the join is nullable, null rows order
unpredictably, and it is the single path that behaves differently from every
other column — disproportionate risk and test surface for the lowest-value sort.

Rejected alternatives:
- **Client-side sort/filter** — only orders the current page; wrong under
  pagination.
- **TanStack Table / a table library** — overkill; fights the existing shadcn
  table + server-action + URL-param stack.

## Sort/filter matrix

| Table    | Sortable columns (base-table)                 | Default sort        | Filter  |
| -------- | --------------------------------------------- | ------------------- | ------- |
| Quotes   | Number, Status, Total, Updated                | `updated_at` desc   | Status  |
| Products | Name, Unit, Default rate                      | `name` asc          | Unit    |
| Clients  | Company, Contact, Email                       | `company` asc       | none    |

## URL parameters

Additive to the existing `q` / `page`. All parameters **compose**; changing a
sort or filter **resets `page` to 1**.

- `sort` — column key (validated against a per-table allow-list).
- `dir`  — `asc` | `desc` (anything else falls back to the column default).
- `status` — Quotes only; validated against `QuoteStatus`.
- `unit`   — Products only; validated against `isProductUnit`.

## Components

### `src/lib/list-params.ts` (new, pure, unit-tested)

The single trust boundary for untrusted sort input. Sits alongside
`pagination.ts` and follows the same "parse untrusted URL value → safe default"
contract as `parsePage`.

- Per-table sort allow-lists (arrays of the columns in the matrix above).
- `parseSort(rawSort, rawDir, allow, fallback)` → `{ column, ascending }`.
  Unknown column or direction falls back to the table default. No throw — a bad
  query param must not error the whole page (same fail-safe philosophy as
  `parsePage`). This is a safe default, not a swallowed error.
- `applySort(query, sort)` → applies `.order(column, { ascending })` to a
  Supabase query builder and returns it.

Filter validation reuses existing closed sets — `QuoteStatus` (from `types.ts`)
and `isProductUnit` (from `product-units.ts`) — so no new validation surface.

### Server actions (`quote-queries.ts`, `clients.ts`, `products.ts`)

Each `list*` action gains a `sort` argument and, for quotes/products, a filter
argument. The additions are small and additive; the existing `.ilike().range()`
logic is unchanged. Order of operations: `.ilike` (search) → `.eq` (filter, when
present and valid) → `applySort` → `.range` (page).

### `SortableHead` (new client component, shared)

Drop-in replacement for `<TableHead>` on sortable columns. Renders the label plus
a direction arrow (tabler `IconArrowUp` / `IconArrowDown`, neutral/dimmed when
the column is not the active sort). Clicking:
- if inactive → sort by this column in its natural default direction;
- if active → toggle `asc`/`desc`;
- pushes the new `sort`/`dir` and **resets `page=1`**, preserving all other
  params via `useSearchParams`.

### `FilterSelect` (new client component, shared)

A shadcn `Select` rendered above the table (Status for Quotes, Unit for
Products). Options come from the relevant closed set plus an "All" clear option.
Selecting sets/clears its param and resets `page=1`, preserving other params.

### Search form composition

The existing search `<form>` (a bare GET form) carries **hidden inputs** for the
active `sort`, `dir`, and filter param so submitting a new search does not drop
them. A GET form only submits its own fields, so without this the sort/filter
would silently reset.

## Edge cases

- Invalid/hostile `?sort=`, `?dir=`, `?status=`, `?unit=` → fall back to the
  table default (sort) or ignore the filter (treated as "All"). Never errors.
- Filter that matches zero rows → the existing empty state renders (copy already
  distinguishes "no results for your search/filter").
- Sort + filter + search + page all set at once → all applied; documented order
  of operations above.
- Nullable columns (e.g. product `unit`, client `contact_name`, `email`) →
  Postgres default null ordering is acceptable; not surfaced to the user in v1.

## Testing

- **Unit** (`list-params.test.ts`): default fallback, unknown column rejected,
  unknown direction rejected, valid column/direction passthrough, allow-list per
  table.
- **E2E** (`/quotes`): click "Total" header → order flips and arrow updates;
  select a Status → list narrows; both survive a page change (params compose).
- **Type check**: new `sort`/`filter` args typed against the allow-list keys, no
  `any`.

## Definition of done

1. Sort + filter work on all three lists per the matrix, edge cases handled.
2. Unit + E2E tests written and passing.
3. `/code-review` run and findings addressed.
4. `docs/CONTEXT.md` updated (new files: `list-params.ts`, `SortableHead`,
   `FilterSelect`) and `docs/DECISIONS.md` gets a dated entry recording the
   URL-driven, server-side, plain-columns-only choice.
