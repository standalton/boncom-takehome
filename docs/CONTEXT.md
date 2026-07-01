# Project Map (AI / Developer Index)

A fast index of this codebase. Read this first to find where something lives
*without* reading every file. For the working *rules*, see `../CLAUDE.md`.

> Keep this file in sync. Any file added, moved, or removed updates the relevant
> section here in the same change. A stale map is worse than no map.

---

## What this project is

A web app for creating and managing client **cost estimates** for an agency.
Users build estimates from custom or catalog line items, see totals update live
as they edit, apply per-line and order-level discounts plus tax, move estimates
through a status pipeline (draft → sent → accepted → paid / declined), and come
back to them later. All data persists to a database with a per-quote audit trail
of who changed what. Replaces an error-prone spreadsheet workflow.

Full design: `docs/superpowers/specs/2026-06-30-estimate-app-design.md`.

## Tech stack

Next.js (App Router) + TypeScript · Supabase (Postgres + Auth + RLS + Realtime)
· Tailwind + shadcn/ui (icons: `@tabler/icons-react`) · Vercel hosting · Vitest
+ Playwright for tests. All pricing math lives in a pure `lib/pricing` module.
Rationale and alternatives in `DECISIONS.md`.

## How to run

```bash
npm install          # install dependencies
npm run dev          # dev server at http://localhost:3000
npm run build        # production build
npm start            # serve the production build
npm test             # Vitest unit tests
npm run test:watch   # Vitest in watch mode
npm run test:e2e     # Playwright E2E tests
npm run typecheck    # tsc --noEmit
```

Environment variables (see `.env.example`): `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server only).

---

## Directory map

_Populated when the project is scaffolded. Format:_

| Path | Responsibility |
| ---- | -------------- |
| `README.md` | Human entry point: what the app is and how to run it. |
| `CLAUDE.md` | Working rules and conventions. |
| `docs/CONTEXT.md` | This file — the project map / index. |
| `docs/STYLE_GUIDE.md` | Design tokens and visual rules (matched to Boncom brand). |
| `docs/DECISIONS.md` | Dated log of meaningful decisions and tradeoffs. |
| `docs/superpowers/specs/` | Design specs. Current: `2026-06-30-estimate-app-design.md`. |

---

## "Where do I look for...?"

_A routing table from concern to location. This is the part that lets an agent
say "it should be in one of these files" without searching. Populated as the
codebase grows. Format:_

| If you need... | Look in... |
| -------------- | ---------- |
| Estimate math (totals, tax, discounts) | `src/lib/pricing.ts` |
| Quote lifecycle (editable? valid transitions?) | `src/lib/quote-status.ts` |
| List sort parsing/validation (?sort, ?dir) | `src/lib/list-params.ts` |
| Dashboard metrics (pure) | `src/lib/dashboard.ts` |
| Status display colours/labels | `src/lib/status-meta.ts` |
| Currency formatting / parsing | `src/lib/money.ts` |
| Product billing units (dropdown options + labels) | `src/lib/product-units.ts` |
| Input validation rules (Zod) | `src/lib/validation.ts` |
| shadcn/ui components | `src/components/ui/` |
| App-specific components | `src/components/` |
| Quote mutations (save, status, duplicate, delete) | `src/actions/quotes.ts` |
| Quote reads (list, get, activity) | `src/actions/quote-queries.ts` |
| Spreadsheet import (parse, resolve, preview logic) | `src/lib/import/` |
| Import server actions (parse/preview/commit) | `src/actions/import.ts` |
| Import wizard UI + route | `src/components/import/`, `src/app/(app)/import/` |
| Transactional import commit (SQL) | `supabase/migrations/0006_import_commit_rpc.sql` |
| RLS policies (per-command, shared workspace) | `supabase/migrations/0001_init.sql`, `0007_tighten_rls_policies.sql` |
| Activity-log write helpers (record + diff) | `src/lib/quote-audit.ts` |
| Server actions (mutations) | `src/actions/` (auth, clients, quotes, products) |
| Supabase clients + middleware | `src/lib/supabase/` |
| Routes / pages | `src/app/(app)/` (dashboard, clients, quotes, products), `src/app/login/` |
| Database schema + seed | `supabase/migrations/`, `supabase/seed.sql` |
| Unit tests | colocated `src/**/*.test.ts` |
| E2E tests | `e2e/` |

---

## Shared / reusable building blocks

_The catalog of reusable components, hooks, and utilities — check here before
building something new, to avoid duplicating what already exists. Format:_

| Name | Location | Purpose |
| ---- | -------- | ------- |
| `computeTotals` | `src/lib/pricing.ts` | Pure estimate math; used by editor (live) and server (save). |
| `isEditableStatus` / `canTransition` / `statusesThatCanBecome` | `src/lib/quote-status.ts` | Quote lifecycle state machine; enforced server-side in `actions/quotes.ts`. |
| `summarizeChanges` | `src/lib/quote-changes.ts` | Diffs a quote save into human-readable change strings for the activity log. |
| `toActivityEntries` / `ActivityEntry` | `src/lib/activity.ts` | Activity-log row → UI entry shape; used by `listActivity` and the history dialog. |
| `formatCents` / `dollarsToCents` | `src/lib/money.ts` | Cents <-> display dollar strings. |
| `PRODUCT_UNITS` / `isProductUnit` / `formatUnit` | `src/lib/product-units.ts` | Closed set of billing units; drives the unit dropdown and server-side validation. |
| `parseSort` / `applySort` | `src/lib/list-params.ts` | Validate an untrusted sort param against a per-table allow-list; apply it to a Supabase query. |
| `QUOTE_STATUSES` / `isQuoteStatus` | `src/lib/quote-status.ts` | Closed status set + guard (derived from the transition map); validates the ?status filter. |
| `SortableHead` | `src/components/SortableHead.tsx` | URL-driven sortable table header (arrow + toggle); preserves other params, resets page. |
| `FilterSelect` | `src/components/FilterSelect.tsx` | URL-driven facet dropdown (quotes: status, products: unit); "All" clears the param. |
| `lineItemSchema` / `quoteSchema` | `src/lib/validation.ts` | Shared Zod validation (UI + server). |
| `collectQuoteErrors` / `hasAnyError` | `src/lib/quote-errors.ts` | Maps the quote schemas to per-field UI errors; drives the editor's live inline validation. |
| `useQuoteValidation` | `src/lib/use-quote-validation.ts` | Editor validation state: blur-then-live `touched` tracking + reveal-on-save (scroll to first invalid field). |
| `HelpHint` + `helpText` | `src/components/HelpHint.tsx`, `src/lib/help-text.ts` | The one tooltip pattern + central copy. |
| `MoneyInput` | `src/components/MoneyInput.tsx` | Currency input bound to integer cents. |
| `NumberInput` | `src/components/NumberInput.tsx` | Numeric input (local text state) reporting a parsed number. |
| `selectAllOnFocus` | `src/lib/field-helpers.ts` | Select an input's contents on focus (with mouseup guard). |
| `sanitizeDecimalInput` | `src/lib/field-helpers.ts` | Clean free-typed numeric text (digits + one point); caps decimals when asked. MoneyInput passes `2` to constrain dollar entry to whole cents; NumberInput uses it uncapped. |
| `formatPhoneInput` + `PHONE_PATTERN` / `isCompletePhone` | `src/lib/field-helpers.ts` | Progressive input mask forcing US phone shape `(123) 456-7890`; `PHONE_PATTERN` is the shared completeness check, reused by NewClientDialog (inline) and the clients server action (backstop). |
| `ClientPicker` | `src/components/ClientPicker.tsx` | Searchable customer combobox with inline "add new". |
| `ClientList` | `src/components/ClientList.tsx` | Clients table; rows expand inline to show that client's quote history (lazy-loaded via listQuotesByClient). |
| `ProductPicker` + `toProductOption` | `src/components/ProductPicker.tsx`, `src/lib/product-option.ts` | Per-line catalog picker; fills a line's description + rate from a product. |
| `NewClientDialog` | `src/components/NewClientDialog.tsx` | Modal to create or edit a client (shared form) without leaving the screen. |
| `ClientActionsMenu` | `src/components/ClientActionsMenu.tsx` | Per-row edit + delete menu for a client (delete refused if quotes exist). |
| `ProductDialog` | `src/components/ProductDialog.tsx` | Create/edit a catalog product (shared form; used by add + edit). |
| `AddProductDialog` | `src/components/AddProductDialog.tsx` | Products-page "Add product" button + create dialog. |
| `ProductActionsMenu` | `src/components/ProductActionsMenu.tsx` | Per-row edit + (soft) delete menu for a catalog product. |
| `SendQuoteDialog` | `src/components/SendQuoteDialog.tsx` | Confirm-send modal shown when a quote moves to "Sent". |
| `QuoteEditor` | `src/components/QuoteEditor.tsx` | The core quote editor (editable number, live totals). |
| `QuoteActivity` | `src/components/QuoteActivity.tsx` | Read-only history timeline of a quote's activity_log (shown in the actions-menu "View history" dialog). |
| `Sidebar` / app shell | `src/components/app-shell/` | Authenticated nav shell. |
| quote/client/auth actions | `src/actions/` | Server-side mutations with validation + audit. |
| `parseCsv` / `parseXlsx` / `toTable` | `src/lib/import/parse.ts` | Spreadsheet file → `SheetTable` (string cells), CSV + XLSX behind one interface. |
| `parseMoneyToCents` | `src/lib/import/parse-money.ts` | Strict currency→cents for import — errors on blank/non-numeric (unlike lenient `dollarsToCents`). |
| `TARGET_FIELDS` / `autoMap` / `buildClientRecord` / `buildProductRecord` / `buildQuoteLineRecord` | `src/lib/import/targets.ts` | Per-target field defs, header auto-mapping, and row→validated-record builders (reuse shared Zod rules). |
| `buildPreview` / `matchExisting` / `suggestPromotions` | `src/lib/import/resolve.ts` | Exact-match resolution (no fuzzy), count-based product-promotion suggestions, and per-row preview assembly. |
| `parseUpload` / `previewImport` / `commitImport` | `src/actions/import.ts` | Import pipeline server actions: server-side parse (capped), DB resolve+validate, transactional commit via `import_commit` RPC. |
| `ImportWizard` | `src/components/import/ImportWizard.tsx` | 3-step import flow (upload → map columns → preview & commit) with a numbered stepper; content-card styling like the editor. Lives at `/import` but is **intentionally not linked in the nav** (kept out of the live demo path); reach it by direct URL. Fully built + tested; see the spec/plan under `docs/superpowers`. |
| `templateCsv` / `DownloadTemplate` | `src/lib/import/template.ts`, `src/components/import/DownloadTemplate.tsx` | Ready-to-fill CSV template per target (headers auto-map to the target's fields); the upload step's "Download template" link downloads it in-browser. |
| `ImportSoonButton` | `src/components/import/ImportSoonButton.tsx` | Disabled "Import (Soon)" teaser on the list-page headers — signals the roadmap while the built feature stays off the demo path. Swap for a `/import` link to ship it. |
