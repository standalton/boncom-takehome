# Spreadsheet Import — Design

Date: 2026-06-30
Status: Approved for planning

## Problem

The app exists to replace an error-prone spreadsheet workflow, but every client,
product, and quote today must be entered by hand through the UI. A team migrating
onto the app — or onboarding with an existing book of clients and a catalog —
has no way to bring their data in. Their data already lives in spreadsheets; the
app should be able to ingest the exact artifact it is replacing.

## Goal

A single, reusable **import engine** that ingests a CSV or XLSX file, maps the
user's columns to our fields, resolves and de-duplicates entities, validates
every row against the existing Zod schemas, shows a full preview of what *will*
happen, and commits the clean rows in one all-or-nothing transaction.

The engine drives three **targets**, which are thin presets on top of it:

- **Quotes (hero flow / migration)** — a flat line-item sheet becomes draft
  quotes, creating clients on the fly and suggesting catalog products.
- **Clients (onboarding)** — bulk-load a client list.
- **Products (onboarding)** — seed the catalog.

Build order is strict: engine + quote import first (proves the pipeline
end-to-end), then the two standalone presets snap on. If time runs short, the
standalone presets are the clean cut line — the hero flow still ships complete.

## Non-goals

- **No confidence scoring / fuzzy auto-merge.** Exact match auto-links; every
  non-exact decision is surfaced to the user, never applied silently. A wrong
  auto-merge corrupts data across every quote for both records; a duplicate is a
  10-second manual fix. We optimize against the expensive failure. See "Key
  decision: entity resolution" below.
- **No new schema fields added to support matching heuristics.** The `clients`
  table already has `company` / `contact_name` / `email` / `phone`; matching uses
  only the identifying field (`company`), not a multi-field score.
- **No editing of tax/discount during import.** Imported quotes land as `draft`
  with tax and discount at 0, to be finished in the existing editor.
- **No background/async job queue.** Import is synchronous within request limits
  (file-size and row caps below). Large-scale imports are out of scope for v1.
- **No partial re-import / update-existing-records-in-place.** Import creates new
  records and links to existing ones; it does not mutate existing client/product
  fields from the sheet.

## Key decision: one pipeline, three presets

The feature is a single staged pipeline. Each stage is a small, independently
testable unit; the three "importers" are configuration on top of it, not
separate flows. This is the "modular and reusable — abstract from real
repetition" rule applied: the repetition (parse, map, resolve, validate, preview,
commit) is factored out once and shared.

```
Upload file -> Parse -> Map columns -> Resolve entities -> Validate -> Preview -> Commit
              (CSV/XLSX  (their cols   (exact-match dedup   (reuse       (per-row  (one
               -> rows)   -> our        + dup/promote        Zod)         status)   transaction)
                          fields)       suggestions)
```

### Stages

- **Parser** — `file -> string[][]` (rows of raw string cells). CSV and XLSX are
  two implementations behind one interface; nothing downstream knows which
  format it received. This is where XLSX isolation lives.
- **Target preset** — per target (clients / products / quotes): the fields we
  need, which are required, and a pure `row -> record` mapping that produces a
  candidate record for validation.
- **Resolver** — exact match (trimmed, case-insensitive) on the identifying
  field auto-links to an existing record; everything else becomes a *suggestion*
  the user resolves in the preview. Product promotion is a **count**, not a
  score: a line description appearing on >= 3 rows across >= 2 clients is
  suggested as a catalog product.
- **Validator** — reuses `src/lib/validation.ts` (`lineItemSchema`,
  `quoteSchema`) and `src/lib/money.ts` (`dollarsToCents`). No parallel
  validation logic. Per-row and **non-blocking**: bad rows are flagged with a
  reason; clean rows remain importable.
- **Commit** — one server action per target that writes everything in a single
  Postgres transaction (a Supabase `plpgsql` RPC), so a failure on row 12 rolls
  back the clients created for rows 1-11. Stamps `created_by` and writes an
  `activity_log` entry, consistent with every other mutation.

### Quote grouping and defaults

A flat line-item sheet needs a grouping key:

- An **optional mappable "Quote" column** (estimate name/number). If mapped,
  rows sharing a value become one quote.
- If **not mapped**, rows group **by client** — one draft quote per client.
- Tax and discount are not present in a raw sheet, so imported quotes are
  created as **`draft` with tax_rate = 0 and discount_type = 'none'**, ready to
  finish in the editor.

## Key decision: entity resolution (exact + user-confirmed)

- **Exact match** (trimmed, case-insensitive) on the identifying field — client
  by `company`/`name`, product by `name` — auto-links to the existing record.
  Correct by construction; never surprises the user.
- **Everything non-exact is a user decision** shown in the preview: create new,
  or link to a suggested existing record. The single human click *is* the
  confidence layer, and it is 100% accurate because a person made the call.
- **Product promotion** is a count-based suggestion, never automatic: a repeated
  line description across multiple clients is offered as "make this a catalog
  product?" The user opts in.

Rejected alternative — multi-field confidence scoring (company + contact + email
+ phone -> threshold): thresholds are indefensible without labeled duplicate
data on a brand-new app, and a bad auto-merge is a silent data-integrity bug far
more expensive than the duplicate it prevents. Human-confirmed resolution is
correct by construction.

## File format: CSV + XLSX

Both are supported. The parser interface is identical for the two; CSV is the
simple, fully-testable path, XLSX handles the real artifact a user drops in.

**Dependency-security note (per CLAUDE.md dependency scanning):** the default
XLSX library, SheetJS (`xlsx` on npm), has a history of CVEs (prototype
pollution, ReDoS) whose patched versions were published to the vendor CDN rather
than npm, so `npm audit` / Dependabot cannot see or fix them. v1 will use an
**npm-auditable** parser instead (candidate: `exceljs`, or a lighter read-only
parser such as `read-excel-file`); the final pick is made during implementation
and recorded in `DECISIONS.md`. This is an explicit dependency-vetting decision,
not a default reach.

## UI: entry points + preview

**Route:** `/(app)/import`, reached from an **Import** action on the Quotes,
Clients, and Products list pages. Each entry point deep-links to the correct
preset; one route, three entry points.

**Three-step wizard:**

1. **Upload + target** — drag a `.csv`/`.xlsx`, choose quotes / clients /
   products (or arrive pre-targeted from a list page).
2. **Map columns** — detected headers on the left, our fields on the right, with
   best-guess auto-mapping by header name (e.g. "Qty" -> Quantity). Unmapped
   **required** fields block progress with a clear message. A **Download
   template** link per target provides a known-good starting sheet.
3. **Preview + commit** — a table where each row carries a resolved status:

   | Status | Meaning | Example reason |
   |--------|---------|----------------|
   | Create | new record will be inserted | new client "Acme Corp" |
   | Link | matched an existing record | linked to existing client "Acme Corp" |
   | Suggest | dedup/promotion hint, user chooses | "'Logo design' on 3 rows -> make a product?" |
   | Warning | imports, but flagged | near-match: did you mean "Acme Corp"? |
   | Error | cannot import; fix or skip | "Quantity must be greater than 0" |

   A summary bar reads, e.g., *"142 rows -> 3 clients, 1 product, 8 quotes. 4
   rows have errors and will be skipped."* Errors are **fixable inline** by
   editing the cell in the preview, rather than forcing a re-upload — the
   concrete form of "let them know what to change." Commit imports the clean
   rows in one transaction and lands the user on the result (or the new quote,
   when the import produced a single one).

## Error handling and edge cases

Per the "no silent failures" and "validate/sanitize all input at trust
boundaries" rules:

- **Trust boundary:** parse **server-side** on the uploaded file. Cap file size
  (~2 MB) and row count (~1000). Reject unknown extension/MIME. This is the
  "file upload / untrusted input" case — designed on purpose, not bolted on.
- **Explicit, friendly errors** for: empty file, header row only / no data rows,
  missing required column, duplicate/ambiguous column mapping.
- **Parsing edge cases:** currency strings (`$1,250.00`), thousands separators,
  blank rows, leading/trailing whitespace, quantity of 0 or negative,
  non-numeric rate, duplicate client names within the same file.

## Testing

- **Unit (the heart of it):** parser, resolver, and each target's `row -> record`
  mapping are pure functions tested with fixture files — clean sheet, messy
  sheet, empty, oversized, mixed valid/invalid. Reuses Vitest.
- **Integration:** the commit RPC rolls back fully on a mid-batch failure (no
  orphaned clients/products).
- **E2E (one critical path):** upload -> map -> preview -> commit -> assert
  records exist. Reuses Playwright.
- **Security:** oversized-file and non-spreadsheet-upload rejection; `npm audit`
  clean on the chosen XLSX dependency.

## Files (anticipated)

New (final layout confirmed during planning):

- `src/lib/import/parse.ts` — CSV/XLSX -> `string[][]` behind one interface.
- `src/lib/import/resolve.ts` — exact-match dedup + suggestion logic.
- `src/lib/import/targets/{clients,products,quotes}.ts` — per-target presets.
- `src/lib/import/types.ts` — shared row/status/preview types.
- `src/actions/import.ts` — commit server actions (transactional RPC callers).
- `supabase/migrations/00XX_import_commit_rpc.sql` — transactional commit
  function(s).
- `src/app/(app)/import/` — wizard route + steps.
- `src/components/import/*` — upload, column-mapper, preview table.
- Colocated `*.test.ts` + fixtures; one `e2e/import.spec.ts`.

`docs/CONTEXT.md` and `docs/DECISIONS.md` updated in the same change (map kept in
sync; XLSX library choice and the no-confidence-scoring decision recorded).
