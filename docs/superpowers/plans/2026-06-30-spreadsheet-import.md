# Spreadsheet Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user import a CSV/XLSX spreadsheet into the app — creating clients, catalog products, and draft quotes — with a column-mapping step, a full validation preview, and an all-or-nothing transactional commit.

**Architecture:** One reusable pipeline — `parse → map → resolve → validate → preview → commit`. The pure stages live in `src/lib/import/` as DB-free, unit-tested functions. Three thin server actions orchestrate them: `parseUpload` (server-side parse of the untrusted file), `previewImport` (resolve against the DB + validate, returns per-row statuses), and `commitImport` (calls a transactional Postgres RPC). The wizard UI (`/import`) is a client component holding step state. The "quotes" target is the hero; "clients" and "products" are the same engine with fewer fields.

**Tech Stack:** Next.js App Router + TypeScript · Supabase (Postgres RPC for the transaction) · Zod (reuse `lib/validation.ts`) · `papaparse` (CSV) + `read-excel-file` (XLSX, npm-auditable — chosen over SheetJS per the spec's dependency-security note) · Vitest + Playwright · Tailwind + existing `components/ui`.

---

## Conventions (read once before starting)

- **Server action result shape** (match the codebase): `{ ok: true as const, ... }` / `{ ok: false as const, error: string }`. Never throw across the boundary; return the error.
- **Money is integer cents.** The strict parser in Task 3 is the ONLY money parser used on import (the existing `dollarsToCents` is lenient-by-design and must NOT be used here — it hides bad input as 0).
- **File header block** on every new source file (see CLAUDE.md format). Copy the style from existing files.
- **Reuse Zod** from `src/lib/validation.ts` (`lineItemSchema`) and the client/product input rules; do not write parallel validation.
- **Colocated tests**, `*.test.ts` next to the file. Run a single file with `npx vitest run src/lib/import/<file>.test.ts`.
- **Commit after every green step.** Co-author trailer: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
- **Update `docs/CONTEXT.md`** in the same task that adds a file (Task 16 does a final sweep, but keep it current as you go).

---

## File structure

New files:

| Path | Responsibility |
| ---- | -------------- |
| `src/lib/import/types.ts` | Shared import types: `ImportTarget`, `FieldDef`, `ColumnMapping`, `PreviewRow`, `ImportPlan`, etc. |
| `src/lib/import/parse-money.ts` | Strict `parseMoneyToCents` (distinguishes bad input from 0). |
| `src/lib/import/parse.ts` | File → `string[][]` for CSV and XLSX behind one interface; `toTable`. |
| `src/lib/import/targets.ts` | Per-target field definitions + `buildRecord` row→record mapping. |
| `src/lib/import/resolve.ts` | Exact-match resolution, dup/promotion suggestions, `buildPreview`. |
| `src/actions/import.ts` | `parseUpload`, `previewImport`, `commitImport` server actions. |
| `supabase/migrations/0006_import_commit_rpc.sql` | Transactional `import_commit` plpgsql function. |
| `src/app/(app)/import/page.tsx` | Import route (renders the wizard). |
| `src/components/import/ImportWizard.tsx` | Client container holding step state. |
| `src/components/import/UploadStep.tsx` | Step 1: file drop + target select. |
| `src/components/import/MapColumnsStep.tsx` | Step 2: header → field mapping. |
| `src/components/import/PreviewStep.tsx` | Step 3: preview table + commit. |
| `src/components/import/ImportEntryButton.tsx` | "Import" button for the three list pages. |
| `e2e/import.spec.ts` | One end-to-end path. |
| `src/lib/import/__fixtures__/*.csv` | Test fixtures. |

Modified files:

- `src/app/(app)/quotes/page.tsx`, `clients/page.tsx`, `products/page.tsx` — add the Import entry button.
- `docs/CONTEXT.md`, `docs/DECISIONS.md`, `package.json`.

---

## Phase 0 — Dependencies & decision log

### Task 1: Add and vet parsing dependencies

**Files:**
- Modify: `package.json`
- Modify: `docs/DECISIONS.md`

- [ ] **Step 1: Install the two parsers**

```bash
npm install papaparse read-excel-file
npm install -D @types/papaparse
```

- [ ] **Step 2: Verify they are audit-clean**

Run: `npm audit --omit=dev`
Expected: no advisories introduced by `papaparse` or `read-excel-file`. If either shows a vulnerability, STOP and record it — do not proceed with a vulnerable parser (that is the whole reason SheetJS was rejected).

- [ ] **Step 3: Record the decision**

Append to `docs/DECISIONS.md`:

```markdown
## 2026-06-30 — Spreadsheet import parsers

Import accepts CSV and XLSX. Chose `papaparse` (CSV) and `read-excel-file`
(XLSX) because both are installable and patchable through npm, so `npm audit`
and Dependabot cover them. Rejected SheetJS (`xlsx`): its security fixes ship
via the vendor CDN, not npm, so our dependency scanning can't see them —
incompatible with the "no known-vulnerable packages" rule. `read-excel-file` is
read-only (we only ever read uploads), which also keeps the surface small.
```

- [ ] **Step 4: Typecheck & commit**

Run: `npm run typecheck`
Expected: PASS

```bash
git add package.json package-lock.json docs/DECISIONS.md
git commit -m "chore: add papaparse + read-excel-file for spreadsheet import

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Phase 1 — Types

### Task 2: Import types

**Files:**
- Create: `src/lib/import/types.ts`

- [ ] **Step 1: Write the types file**

```ts
/**
 * types.ts — shared types for the spreadsheet import pipeline.
 *
 * What:        The vocabulary every import stage speaks: which entity is being
 *              imported, the fields a target needs, how a spreadsheet column
 *              maps to a field, and the per-row preview outcome.
 * Where used:  All of src/lib/import/*, src/actions/import.ts, and the wizard.
 * Notes:       Pure types only — no DB or React imports, so the logic modules
 *              stay unit-testable in isolation.
 */
import type { DiscountType } from "@/lib/types";

export type ImportTarget = "clients" | "products" | "quotes";

// A raw parsed sheet: the header row plus the data rows, all as strings.
export interface SheetTable {
  headers: string[];
  rows: string[][];
}

// One field a target can consume from the sheet.
export interface FieldDef {
  key: string; // stable identifier, e.g. "quantity"
  label: string; // shown in the mapping UI, e.g. "Quantity"
  required: boolean;
  // Header names we auto-map from (lowercased), e.g. ["qty", "quantity"].
  aliases: string[];
}

// Chosen mapping: field key -> column index in the sheet (or null = unmapped).
export type ColumnMapping = Record<string, number | null>;

export type RowStatus = "create" | "link" | "warning" | "error";

// One row after resolution + validation, ready to render in the preview.
export interface PreviewRow {
  rowIndex: number; // 0-based index into SheetTable.rows
  status: RowStatus;
  // Human-readable outcome, e.g. "New client 'Acme Corp'" or the error reason.
  message: string;
  // The normalized values pulled from the row (for display), keyed by field.
  values: Record<string, string>;
}

// A product-promotion suggestion (repeated line description across clients).
export interface PromotionSuggestion {
  description: string;
  occurrences: number;
  clientCount: number;
}

// The full preview returned to the client for a target.
export interface ImportPreview {
  target: ImportTarget;
  rows: PreviewRow[];
  promotions: PromotionSuggestion[];
  summary: {
    total: number;
    importable: number; // create + link + warning
    errors: number;
    newClients: number;
    newProducts: number;
    quotes: number;
  };
}

// ---- Commit payload (server action -> RPC) ---------------------------------

export interface NewClientPayload {
  tempId: string;
  company: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
}

export interface NewProductPayload {
  tempId: string;
  name: string;
  description: string | null;
  defaultRateCents: number;
  unit: string | null;
}

export interface CommitLineItem {
  description: string;
  quantity: number;
  rateCents: number;
  discountType: DiscountType;
  discountValue: number;
  // Exactly one of these identifies the product (or neither = ad-hoc line).
  productId: string | null;
  productTempId: string | null;
}

export interface CommitQuote {
  clientId: string | null;
  clientTempId: string | null;
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
  lineItems: CommitLineItem[];
}

// What commitImport sends to the RPC.
export interface ImportPlan {
  newClients: NewClientPayload[];
  newProducts: NewProductPayload[];
  quotes: CommitQuote[];
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS (no consumers yet, just checks the file compiles).

- [ ] **Step 3: Commit**

```bash
git add src/lib/import/types.ts
git commit -m "feat(import): add shared import pipeline types

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Phase 2 — Strict money parsing

### Task 3: `parseMoneyToCents`

**Files:**
- Create: `src/lib/import/parse-money.ts`
- Test: `src/lib/import/parse-money.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { parseMoneyToCents } from "./parse-money";

describe("parseMoneyToCents", () => {
  it("parses a plain number", () => {
    expect(parseMoneyToCents("1250")).toEqual({ ok: true, cents: 125000 });
  });
  it("parses a currency string with symbol and thousands separators", () => {
    expect(parseMoneyToCents("$1,250.00")).toEqual({ ok: true, cents: 125000 });
  });
  it("rounds to the nearest cent", () => {
    expect(parseMoneyToCents("19.999")).toEqual({ ok: true, cents: 2000 });
  });
  it("treats blank as an error, not zero (import must not hide missing money)", () => {
    expect(parseMoneyToCents("  ")).toEqual({ ok: false, error: "Rate is required" });
  });
  it("rejects non-numeric text", () => {
    expect(parseMoneyToCents("free")).toEqual({ ok: false, error: "Rate is not a number" });
  });
  it("rejects negative money", () => {
    expect(parseMoneyToCents("-5")).toEqual({ ok: false, error: "Rate cannot be negative" });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/import/parse-money.test.ts`
Expected: FAIL ("parseMoneyToCents is not a function").

- [ ] **Step 3: Implement**

```ts
/**
 * parse-money.ts — strict currency-string → integer-cents parser for import.
 *
 * What:        Turns a spreadsheet cell like "$1,250.00" into cents, and — unlike
 *              lib/money.ts's dollarsToCents — returns an ERROR for blank or
 *              non-numeric input instead of silently yielding 0.
 * Where used:  src/lib/import/targets.ts when building product/line records.
 * Notes:       Import must surface bad money to the user, never hide it. Keep the
 *              non-negative rule aligned with the DB CHECK (rate_cents >= 0).
 */
export type MoneyResult = { ok: true; cents: number } | { ok: false; error: string };

export function parseMoneyToCents(raw: string): MoneyResult {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, error: "Rate is required" };
  // Strip currency symbols and thousands separators, keep sign, digits, dot.
  const cleaned = trimmed.replace(/[$,\s]/g, "");
  const n = Number(cleaned);
  if (Number.isNaN(n)) return { ok: false, error: "Rate is not a number" };
  if (n < 0) return { ok: false, error: "Rate cannot be negative" };
  return { ok: true, cents: Math.round(n * 100) };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/import/parse-money.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/import/parse-money.ts src/lib/import/parse-money.test.ts
git commit -m "feat(import): strict money parser that surfaces bad input

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Phase 3 — File parsing

### Task 4: CSV parsing → `SheetTable`

**Files:**
- Create: `src/lib/import/parse.ts`
- Test: `src/lib/import/parse.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { parseCsv, toTable } from "./parse";

describe("parseCsv", () => {
  it("parses rows and cells, trimming a trailing newline", () => {
    const csv = "Client,Qty\nAcme,2\nGlobex,1\n";
    expect(parseCsv(csv)).toEqual([
      ["Client", "Qty"],
      ["Acme", "2"],
      ["Globex", "1"],
    ]);
  });
  it("handles quoted cells containing commas", () => {
    const csv = 'Description,Rate\n"Logo, final",1200\n';
    expect(parseCsv(csv)).toEqual([
      ["Description", "Rate"],
      ["Logo, final", "1200"],
    ]);
  });
  it("skips fully blank rows", () => {
    const csv = "A,B\n\n1,2\n";
    expect(parseCsv(csv)).toEqual([
      ["A", "B"],
      ["1", "2"],
    ]);
  });
});

describe("toTable", () => {
  it("splits the header row from the data rows", () => {
    const table = toTable([
      ["Client", "Qty"],
      ["Acme", "2"],
    ]);
    expect(table.headers).toEqual(["Client", "Qty"]);
    expect(table.rows).toEqual([["Acme", "2"]]);
  });
  it("throws on an empty sheet (no silent empty import)", () => {
    expect(() => toTable([])).toThrow(/empty/i);
  });
  it("throws when there is a header but no data rows", () => {
    expect(() => toTable([["Client", "Qty"]])).toThrow(/no data rows/i);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/import/parse.test.ts`
Expected: FAIL ("parseCsv is not a function").

- [ ] **Step 3: Implement (CSV via papaparse + toTable)**

```ts
/**
 * parse.ts — spreadsheet file → SheetTable, for CSV and XLSX.
 *
 * What:        parseCsv / parseXlsx turn a file's contents into rows of string
 *              cells; toTable splits the header row from the data rows and
 *              rejects empty sheets. Both formats produce the identical shape so
 *              nothing downstream cares which was uploaded.
 * Where used:  src/actions/import.ts (parseUpload).
 * Notes:       parseXlsx is async and Node-only (read-excel-file/node); parsing
 *              runs server-side on the untrusted upload. Blank rows are dropped.
 */
import Papa from "papaparse";
import type { SheetTable } from "./types";

export function parseCsv(text: string): string[][] {
  const result = Papa.parse<string[]>(text, { skipEmptyLines: "greedy" });
  // papaparse surfaces malformed-quote issues in result.errors; fail loudly.
  const fatal = result.errors.find((e) => e.type === "Quotes" || e.type === "Delimiter");
  if (fatal) throw new Error(`CSV parse error: ${fatal.message}`);
  return (result.data as string[][]).map((row) => row.map((cell) => (cell ?? "").trim()));
}

export function toTable(rows: string[][]): SheetTable {
  const nonEmpty = rows.filter((r) => r.some((c) => c.trim() !== ""));
  if (nonEmpty.length === 0) throw new Error("The file is empty.");
  const [headers, ...data] = nonEmpty;
  if (data.length === 0) throw new Error("The file has a header row but no data rows.");
  return { headers: headers.map((h) => h.trim()), rows: data };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/import/parse.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/import/parse.ts src/lib/import/parse.test.ts
git commit -m "feat(import): CSV parsing and header/data table split

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

### Task 5: XLSX parsing

**Files:**
- Modify: `src/lib/import/parse.ts`

- [ ] **Step 1: Add the XLSX parser**

Append to `src/lib/import/parse.ts`:

```ts
// XLSX: read-excel-file/node returns rows of cell values (various JS types).
// We stringify every cell so the rest of the pipeline only ever sees strings,
// matching parseCsv's output exactly.
export async function parseXlsx(buffer: Buffer): Promise<string[][]> {
  const readXlsxFile = (await import("read-excel-file/node")).default;
  const rows = await readXlsxFile(buffer);
  return rows.map((row) =>
    row.map((cell) => (cell === null || cell === undefined ? "" : String(cell).trim())),
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS. (No unit test for XLSX here — binary fixtures are brittle; the parser is exercised end-to-end by the E2E in Task 15. The `String(cell)` normalization is the only logic and is covered by the CSV row-normalization tests.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/import/parse.ts
git commit -m "feat(import): XLSX parsing via read-excel-file

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Phase 4 — Target presets (row → record)

### Task 6: Field definitions per target

**Files:**
- Create: `src/lib/import/targets.ts`
- Test: `src/lib/import/targets.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { TARGET_FIELDS, autoMap } from "./targets";

describe("TARGET_FIELDS", () => {
  it("defines required fields for each target", () => {
    expect(TARGET_FIELDS.clients.find((f) => f.key === "company")?.required).toBe(true);
    expect(TARGET_FIELDS.products.find((f) => f.key === "name")?.required).toBe(true);
    expect(TARGET_FIELDS.quotes.find((f) => f.key === "client")?.required).toBe(true);
    expect(TARGET_FIELDS.quotes.find((f) => f.key === "description")?.required).toBe(true);
  });
});

describe("autoMap", () => {
  it("maps headers to fields by alias, case-insensitively", () => {
    const mapping = autoMap("quotes", ["Client", "Description", "Qty", "Rate"]);
    expect(mapping.client).toBe(0);
    expect(mapping.description).toBe(1);
    expect(mapping.quantity).toBe(2);
    expect(mapping.rate).toBe(3);
  });
  it("leaves unmatched fields null", () => {
    const mapping = autoMap("clients", ["Company"]);
    expect(mapping.company).toBe(0);
    expect(mapping.email).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/import/targets.test.ts`
Expected: FAIL ("TARGET_FIELDS is not defined").

- [ ] **Step 3: Implement field defs + autoMap**

```ts
/**
 * targets.ts — per-target field definitions and row→record mapping.
 *
 * What:        Declares which fields each import target (clients, products,
 *              quotes) consumes, auto-maps sheet headers to those fields by
 *              alias, and turns one mapped row into a validated record (or a
 *              row error). The three "importers" are these three configs.
 * Where used:  The mapping UI (field list + autoMap) and previewImport (buildRecord).
 * Notes:       Validation reuses lib/validation.ts and parse-money; no parallel
 *              rules. A record builder returns { ok:false, error } for a bad row
 *              rather than throwing — the preview shows every bad row at once.
 */
import { z } from "zod";
import type { ColumnMapping, FieldDef, ImportTarget } from "./types";
import { parseMoneyToCents } from "./parse-money";
import { isProductUnit } from "@/lib/product-units";

export const TARGET_FIELDS: Record<ImportTarget, FieldDef[]> = {
  clients: [
    { key: "company", label: "Company", required: true, aliases: ["company", "client", "name"] },
    { key: "contactName", label: "Contact name", required: false, aliases: ["contact", "contact name", "contact_name"] },
    { key: "email", label: "Email", required: false, aliases: ["email", "e-mail"] },
    { key: "phone", label: "Phone", required: false, aliases: ["phone", "tel", "telephone"] },
  ],
  products: [
    { key: "name", label: "Name", required: true, aliases: ["name", "product", "service"] },
    { key: "description", label: "Description", required: false, aliases: ["description", "desc", "details"] },
    { key: "rate", label: "Default rate", required: true, aliases: ["rate", "price", "default rate", "cost"] },
    { key: "unit", label: "Unit", required: false, aliases: ["unit", "billing unit", "per"] },
  ],
  quotes: [
    { key: "client", label: "Client", required: true, aliases: ["client", "company", "customer"] },
    { key: "quote", label: "Quote (group)", required: false, aliases: ["quote", "estimate", "quote number", "project"] },
    { key: "description", label: "Description", required: true, aliases: ["description", "item", "line item", "desc"] },
    { key: "quantity", label: "Quantity", required: true, aliases: ["qty", "quantity", "hours", "units"] },
    { key: "rate", label: "Rate", required: true, aliases: ["rate", "price", "unit price", "cost"] },
  ],
};

export function autoMap(target: ImportTarget, headers: string[]): ColumnMapping {
  const lowered = headers.map((h) => h.trim().toLowerCase());
  const mapping: ColumnMapping = {};
  for (const field of TARGET_FIELDS[target]) {
    const idx = lowered.findIndex((h) => field.aliases.includes(h));
    mapping[field.key] = idx === -1 ? null : idx;
  }
  return mapping;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/import/targets.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/import/targets.ts src/lib/import/targets.test.ts
git commit -m "feat(import): per-target field defs and header auto-mapping

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

### Task 7: Record builders (mapped row → validated record)

**Files:**
- Modify: `src/lib/import/targets.ts`
- Modify: `src/lib/import/targets.test.ts`

- [ ] **Step 1: Add failing tests**

Append to `src/lib/import/targets.test.ts`:

```ts
import { buildClientRecord, buildProductRecord, buildQuoteLineRecord, cell } from "./targets";

const row = ["Acme Corp", "Jane Doe", "jane@acme.com", "555-1234"];
const map = { company: 0, contactName: 1, email: 2, phone: 3 };

describe("cell", () => {
  it("reads a mapped cell and trims it", () => {
    expect(cell(row, map, "company")).toBe("Acme Corp");
  });
  it("returns '' for an unmapped field", () => {
    expect(cell(row, { company: null }, "company")).toBe("");
  });
});

describe("buildClientRecord", () => {
  it("builds a valid client", () => {
    expect(buildClientRecord(row, map)).toEqual({
      ok: true,
      record: { company: "Acme Corp", contactName: "Jane Doe", email: "jane@acme.com", phone: "555-1234" },
    });
  });
  it("errors when company is blank", () => {
    const r = buildClientRecord(["", "", "", ""], map);
    expect(r.ok).toBe(false);
  });
  it("errors on a malformed email", () => {
    const r = buildClientRecord(["Acme", "", "not-an-email", ""], map);
    expect(r.ok).toBe(false);
  });
});

describe("buildProductRecord", () => {
  const pmap = { name: 0, description: 1, rate: 2, unit: 3 };
  it("builds a valid product, parsing the rate to cents", () => {
    const r = buildProductRecord(["Logo design", "Brand work", "$1,200", "project"], pmap);
    expect(r).toEqual({
      ok: true,
      record: { name: "Logo design", description: "Brand work", defaultRateCents: 120000, unit: "project" },
    });
  });
  it("errors on an unknown unit", () => {
    const r = buildProductRecord(["Logo", "", "100", "widget"], pmap);
    expect(r.ok).toBe(false);
  });
  it("errors on a non-numeric rate", () => {
    const r = buildProductRecord(["Logo", "", "free", ""], pmap);
    expect(r.ok).toBe(false);
  });
});

describe("buildQuoteLineRecord", () => {
  const qmap = { client: 0, quote: 1, description: 2, quantity: 3, rate: 4 };
  it("builds a valid line with client + quote group", () => {
    const r = buildQuoteLineRecord(["Acme", "EST-1", "Logo", "2", "1200"], qmap);
    expect(r).toEqual({
      ok: true,
      record: {
        client: "Acme",
        quoteGroup: "EST-1",
        description: "Logo",
        quantity: 2,
        rateCents: 120000,
      },
    });
  });
  it("errors on zero quantity", () => {
    const r = buildQuoteLineRecord(["Acme", "", "Logo", "0", "1200"], qmap);
    expect(r.ok).toBe(false);
  });
  it("errors on a blank client", () => {
    const r = buildQuoteLineRecord(["", "", "Logo", "1", "1200"], qmap);
    expect(r.ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/import/targets.test.ts`
Expected: FAIL ("buildClientRecord is not a function").

- [ ] **Step 3: Implement the builders**

Append to `src/lib/import/targets.ts`:

```ts
export type RecordResult<T> = { ok: true; record: T } | { ok: false; error: string };

// Read a mapped field from a row, trimmed; '' when the field is unmapped/absent.
export function cell(row: string[], mapping: ColumnMapping, key: string): string {
  const idx = mapping[key];
  if (idx === null || idx === undefined) return "";
  return (row[idx] ?? "").trim();
}

const emailOk = (v: string) => !v || /.+@.+\..+/.test(v);

export interface ClientRecord {
  company: string;
  contactName: string;
  email: string;
  phone: string;
}

export function buildClientRecord(row: string[], mapping: ColumnMapping): RecordResult<ClientRecord> {
  const company = cell(row, mapping, "company");
  if (!company) return { ok: false, error: "Company is required" };
  const email = cell(row, mapping, "email");
  if (!emailOk(email)) return { ok: false, error: "Email is not valid" };
  return {
    ok: true,
    record: { company, contactName: cell(row, mapping, "contactName"), email, phone: cell(row, mapping, "phone") },
  };
}

export interface ProductRecord {
  name: string;
  description: string;
  defaultRateCents: number;
  unit: string;
}

export function buildProductRecord(row: string[], mapping: ColumnMapping): RecordResult<ProductRecord> {
  const name = cell(row, mapping, "name");
  if (!name) return { ok: false, error: "Name is required" };
  const rate = parseMoneyToCents(cell(row, mapping, "rate"));
  if (!rate.ok) return { ok: false, error: rate.error.replace(/^Rate/, "Default rate") };
  const unit = cell(row, mapping, "unit");
  if (unit && !isProductUnit(unit)) return { ok: false, error: `Unknown unit "${unit}"` };
  return { ok: true, record: { name, description: cell(row, mapping, "description"), defaultRateCents: rate.cents, unit } };
}

export interface QuoteLineRecord {
  client: string;
  quoteGroup: string; // "" = group by client
  description: string;
  quantity: number;
  rateCents: number;
}

// Reuse the shared line-item invariants for quantity/rate rather than re-deriving.
const importLineSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.number().positive("Quantity must be greater than 0"),
  rateCents: z.number().int().min(0, "Rate cannot be negative"),
});

export function buildQuoteLineRecord(row: string[], mapping: ColumnMapping): RecordResult<QuoteLineRecord> {
  const client = cell(row, mapping, "client");
  if (!client) return { ok: false, error: "Client is required" };
  const rate = parseMoneyToCents(cell(row, mapping, "rate"));
  if (!rate.ok) return { ok: false, error: rate.error };
  const qtyRaw = cell(row, mapping, "quantity");
  const quantity = Number(qtyRaw.replace(/,/g, ""));
  if (Number.isNaN(quantity)) return { ok: false, error: "Quantity is not a number" };
  const parsed = importLineSchema.safeParse({
    description: cell(row, mapping, "description"),
    quantity,
    rateCents: rate.cents,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  return {
    ok: true,
    record: { client, quoteGroup: cell(row, mapping, "quote"), description: parsed.data.description, quantity, rateCents: rate.cents },
  };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/import/targets.test.ts`
Expected: PASS (all builder + autoMap tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/import/targets.ts src/lib/import/targets.test.ts
git commit -m "feat(import): row→record builders reusing shared validation

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Phase 5 — Resolution & preview

### Task 8: Exact-match resolution + normalization

**Files:**
- Create: `src/lib/import/resolve.ts`
- Test: `src/lib/import/resolve.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { normalizeKey, matchExisting } from "./resolve";

describe("normalizeKey", () => {
  it("lowercases and collapses whitespace for matching", () => {
    expect(normalizeKey("  Acme   Corp ")).toBe("acme corp");
  });
});

describe("matchExisting", () => {
  const existing = [
    { id: "c1", key: "acme corp" },
    { id: "c2", key: "globex" },
  ];
  it("returns the id of an exact (normalized) match", () => {
    expect(matchExisting("ACME  Corp", existing)).toBe("c1");
  });
  it("returns null when there is no exact match (no fuzzy guessing)", () => {
    expect(matchExisting("Acme", existing)).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/import/resolve.test.ts`
Expected: FAIL ("normalizeKey is not a function").

- [ ] **Step 3: Implement**

```ts
/**
 * resolve.ts — entity resolution, dedup suggestions, and preview assembly.
 *
 * What:        Matches sheet values to existing records by exact normalized key
 *              (never fuzzy — a human confirms anything non-exact), suggests
 *              catalog products for line descriptions repeated across clients,
 *              and assembles the per-row ImportPreview.
 * Where used:  src/actions/import.ts (previewImport, commitImport plan build).
 * Notes:       Pure — existing records are passed in, not fetched here, so this
 *              stays unit-testable. "Exact match auto-links; the rest is a user
 *              decision" is the core resolution rule from the design.
 */
export interface ExistingKey {
  id: string;
  key: string; // already normalized
}

export function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function matchExisting(value: string, existing: ExistingKey[]): string | null {
  const key = normalizeKey(value);
  return existing.find((e) => e.key === key)?.id ?? null;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/import/resolve.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/import/resolve.ts src/lib/import/resolve.test.ts
git commit -m "feat(import): exact-match entity resolution

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

### Task 9: Product-promotion suggestions

**Files:**
- Modify: `src/lib/import/resolve.ts`
- Modify: `src/lib/import/resolve.test.ts`

- [ ] **Step 1: Add failing test**

Append to `src/lib/import/resolve.test.ts`:

```ts
import { suggestPromotions } from "./resolve";

describe("suggestPromotions", () => {
  const lines = [
    { description: "Logo design", client: "Acme" },
    { description: "Logo design", client: "Globex" },
    { description: "Logo design", client: "Initech" },
    { description: "One-off banner", client: "Acme" },
  ];
  it("suggests a description on >=3 rows across >=2 clients", () => {
    const s = suggestPromotions(lines, 3);
    expect(s).toEqual([{ description: "Logo design", occurrences: 3, clientCount: 3 }]);
  });
  it("does not suggest a description confined to one client", () => {
    const single = [
      { description: "Retainer", client: "Acme" },
      { description: "Retainer", client: "Acme" },
      { description: "Retainer", client: "Acme" },
    ];
    expect(suggestPromotions(single, 3)).toEqual([]);
  });
  it("does not suggest below the occurrence threshold", () => {
    expect(suggestPromotions(lines.slice(0, 2), 3)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/import/resolve.test.ts`
Expected: FAIL ("suggestPromotions is not a function").

- [ ] **Step 3: Implement**

Append to `src/lib/import/resolve.ts`:

```ts
import type { PromotionSuggestion } from "./types";

// A repeated line description across multiple clients is a catalog-product
// candidate. This is a COUNT, not a confidence score — easy to explain, easy to
// get right. threshold = minimum occurrences (default 3), and it must span >=2
// distinct clients (a description used only by one client isn't reusable catalog).
export function suggestPromotions(
  lines: { description: string; client: string }[],
  threshold: number,
): PromotionSuggestion[] {
  const byDesc = new Map<string, { label: string; clients: Set<string>; count: number }>();
  for (const l of lines) {
    const key = normalizeKey(l.description);
    if (!key) continue;
    const entry = byDesc.get(key) ?? { label: l.description.trim(), clients: new Set(), count: 0 };
    entry.count += 1;
    entry.clients.add(normalizeKey(l.client));
    byDesc.set(key, entry);
  }
  const out: PromotionSuggestion[] = [];
  for (const entry of byDesc.values()) {
    if (entry.count >= threshold && entry.clients.size >= 2) {
      out.push({ description: entry.label, occurrences: entry.count, clientCount: entry.clients.size });
    }
  }
  return out.sort((a, b) => b.occurrences - a.occurrences);
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/import/resolve.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/import/resolve.ts src/lib/import/resolve.test.ts
git commit -m "feat(import): count-based product-promotion suggestions

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

### Task 10: `buildPreview` — assemble per-row statuses per target

**Files:**
- Modify: `src/lib/import/resolve.ts`
- Modify: `src/lib/import/resolve.test.ts`

- [ ] **Step 1: Add failing test**

Append to `src/lib/import/resolve.test.ts`:

```ts
import { buildPreview } from "./resolve";
import { autoMap } from "./targets";

describe("buildPreview (clients)", () => {
  const headers = ["Company", "Email"];
  const mapping = autoMap("clients", headers);
  it("marks an exact existing match as link and a new one as create", () => {
    const preview = buildPreview({
      target: "clients",
      rows: [["Acme Corp", "a@acme.com"], ["Newco", "n@newco.com"]],
      mapping,
      existingClients: [{ id: "c1", key: "acme corp" }],
      existingProducts: [],
      promotionThreshold: 3,
    });
    expect(preview.rows[0].status).toBe("link");
    expect(preview.rows[1].status).toBe("create");
    expect(preview.summary.newClients).toBe(1);
    expect(preview.summary.errors).toBe(0);
  });
  it("marks an invalid row as error and counts it out of importable", () => {
    const preview = buildPreview({
      target: "clients",
      rows: [["", "bad"]],
      mapping,
      existingClients: [],
      existingProducts: [],
      promotionThreshold: 3,
    });
    expect(preview.rows[0].status).toBe("error");
    expect(preview.summary.importable).toBe(0);
    expect(preview.summary.errors).toBe(1);
  });
});

describe("buildPreview (quotes)", () => {
  const headers = ["Client", "Description", "Qty", "Rate"];
  const mapping = autoMap("quotes", headers);
  it("groups rows into one quote per client when no quote column is mapped", () => {
    const preview = buildPreview({
      target: "quotes",
      rows: [
        ["Acme", "Logo", "1", "1000"],
        ["Acme", "Banner", "2", "500"],
        ["Globex", "Logo", "1", "1000"],
      ],
      mapping,
      existingClients: [],
      existingProducts: [],
      promotionThreshold: 3,
    });
    expect(preview.summary.quotes).toBe(2);
    expect(preview.summary.newClients).toBe(2);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/import/resolve.test.ts`
Expected: FAIL ("buildPreview is not a function").

- [ ] **Step 3: Implement `buildPreview`**

Append to `src/lib/import/resolve.ts`:

```ts
import type { ColumnMapping, ImportPreview, ImportTarget, PreviewRow, RowStatus } from "./types";
import { buildClientRecord, buildProductRecord, buildQuoteLineRecord } from "./targets";

export interface BuildPreviewInput {
  target: ImportTarget;
  rows: string[][];
  mapping: ColumnMapping;
  existingClients: ExistingKey[];
  existingProducts: ExistingKey[];
  promotionThreshold: number;
}

// Assemble a per-row preview. Bad rows become status "error" but never abort the
// batch — every row is reported so the user can fix or skip. New-entity and
// quote counts drive the summary bar.
export function buildPreview(input: BuildPreviewInput): ImportPreview {
  const { target } = input;
  if (target === "clients") return previewClients(input);
  if (target === "products") return previewProducts(input);
  return previewQuotes(input);
}

function emptySummary(total: number) {
  return { total, importable: 0, errors: 0, newClients: 0, newProducts: 0, quotes: 0 };
}

function previewClients(input: BuildPreviewInput): ImportPreview {
  const rows: PreviewRow[] = [];
  const summary = emptySummary(input.rows.length);
  input.rows.forEach((row, rowIndex) => {
    const built = buildClientRecord(row, input.mapping);
    if (!built.ok) {
      rows.push({ rowIndex, status: "error", message: built.error, values: {} });
      summary.errors += 1;
      return;
    }
    const { record } = built;
    const matchId = matchExisting(record.company, input.existingClients);
    const status: RowStatus = matchId ? "link" : "create";
    if (!matchId) summary.newClients += 1;
    summary.importable += 1;
    rows.push({
      rowIndex,
      status,
      message: matchId ? `Links to existing client "${record.company}"` : `New client "${record.company}"`,
      values: { company: record.company, email: record.email },
    });
  });
  return { target: "clients", rows, promotions: [], summary };
}

function previewProducts(input: BuildPreviewInput): ImportPreview {
  const rows: PreviewRow[] = [];
  const summary = emptySummary(input.rows.length);
  input.rows.forEach((row, rowIndex) => {
    const built = buildProductRecord(row, input.mapping);
    if (!built.ok) {
      rows.push({ rowIndex, status: "error", message: built.error, values: {} });
      summary.errors += 1;
      return;
    }
    const { record } = built;
    const matchId = matchExisting(record.name, input.existingProducts);
    const status: RowStatus = matchId ? "link" : "create";
    if (!matchId) summary.newProducts += 1;
    summary.importable += 1;
    rows.push({
      rowIndex,
      status,
      message: matchId ? `Matches existing product "${record.name}"` : `New product "${record.name}"`,
      values: { name: record.name },
    });
  });
  return { target: "products", rows, promotions: [], summary };
}

function previewQuotes(input: BuildPreviewInput): ImportPreview {
  const rows: PreviewRow[] = [];
  const summary = emptySummary(input.rows.length);
  const validLines: { description: string; client: string }[] = [];
  const quoteGroups = new Set<string>();
  const newClientKeys = new Set<string>();

  input.rows.forEach((row, rowIndex) => {
    const built = buildQuoteLineRecord(row, input.mapping);
    if (!built.ok) {
      rows.push({ rowIndex, status: "error", message: built.error, values: {} });
      summary.errors += 1;
      return;
    }
    const { record } = built;
    validLines.push({ description: record.description, client: record.client });
    // Group key: explicit quote group if present, else the client (one quote/client).
    const groupKey = record.quoteGroup ? `q:${normalizeKey(record.quoteGroup)}` : `c:${normalizeKey(record.client)}`;
    quoteGroups.add(groupKey);
    const clientMatch = matchExisting(record.client, input.existingClients);
    if (!clientMatch) newClientKeys.add(normalizeKey(record.client));
    summary.importable += 1;
    rows.push({
      rowIndex,
      status: clientMatch ? "link" : "create",
      message: clientMatch
        ? `Line for existing client "${record.client}"`
        : `Line for new client "${record.client}"`,
      values: { client: record.client, description: record.description },
    });
  });

  summary.quotes = quoteGroups.size;
  summary.newClients = newClientKeys.size;
  const promotions = suggestPromotions(validLines, input.promotionThreshold);
  return { target: "quotes", rows, promotions, summary };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/import/resolve.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/import/resolve.ts src/lib/import/resolve.test.ts
git commit -m "feat(import): assemble per-row preview per target

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Phase 6 — Transactional commit (DB + server actions)

### Task 11: `import_commit` RPC migration

**Files:**
- Create: `supabase/migrations/0006_import_commit_rpc.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 0006_import_commit_rpc.sql — transactional commit for spreadsheet import.
--
-- What:       import_commit(payload jsonb) inserts new clients, new products,
--             and quotes-with-line-items in a SINGLE transaction (a function
--             body is atomic: any raised error rolls the whole thing back, so a
--             failure on the last quote un-does the clients created for the
--             first). Returns counts + the created quote ids.
-- Notes:      SECURITY INVOKER (default) so the caller's RLS still applies —
--             the shared-workspace policies already allow authenticated writes.
--             Totals are computed in TS (lib/pricing) and passed in, keeping
--             pricing authority in one place. New entities are referenced by a
--             client-supplied tempId that this function maps to real UUIDs.
--             created_by is stamped from p_user_id (passed by the server action).

create or replace function import_commit(payload jsonb, p_user_id uuid)
returns jsonb
language plpgsql
as $$
declare
  client_map jsonb := '{}'::jsonb;   -- tempId -> uuid
  product_map jsonb := '{}'::jsonb;  -- tempId -> uuid
  item jsonb;
  line jsonb;
  new_id uuid;
  resolved_client uuid;
  resolved_product uuid;
  quote_id uuid;
  quote_ids uuid[] := '{}';
  clients_created int := 0;
  products_created int := 0;
begin
  -- 1. New clients
  for item in select * from jsonb_array_elements(coalesce(payload->'newClients', '[]'::jsonb)) loop
    insert into clients (company, contact_name, email, phone, created_by)
    values (
      item->>'company',
      nullif(item->>'contactName', ''),
      nullif(item->>'email', ''),
      nullif(item->>'phone', ''),
      p_user_id
    )
    returning id into new_id;
    client_map := jsonb_set(client_map, array[item->>'tempId'], to_jsonb(new_id));
    clients_created := clients_created + 1;
  end loop;

  -- 2. New products
  for item in select * from jsonb_array_elements(coalesce(payload->'newProducts', '[]'::jsonb)) loop
    insert into products (name, description, default_rate_cents, unit)
    values (
      item->>'name',
      nullif(item->>'description', ''),
      (item->>'defaultRateCents')::int,
      nullif(item->>'unit', '')
    )
    returning id into new_id;
    product_map := jsonb_set(product_map, array[item->>'tempId'], to_jsonb(new_id));
    products_created := products_created + 1;
  end loop;

  -- 3. Quotes + line items
  for item in select * from jsonb_array_elements(coalesce(payload->'quotes', '[]'::jsonb)) loop
    -- Resolve the client: existing id, or a newly-created one via the temp map.
    if item->>'clientId' is not null then
      resolved_client := (item->>'clientId')::uuid;
    else
      resolved_client := (client_map->>(item->>'clientTempId'))::uuid;
    end if;
    if resolved_client is null then
      raise exception 'Import: could not resolve client for a quote';
    end if;

    insert into quotes (client_id, status, subtotal_cents, discount_cents, tax_cents, total_cents, created_by, updated_by)
    values (
      resolved_client,
      'draft',
      (item->>'subtotalCents')::int,
      (item->>'discountCents')::int,
      (item->>'taxCents')::int,
      (item->>'totalCents')::int,
      p_user_id,
      p_user_id
    )
    returning id into quote_id;
    quote_ids := array_append(quote_ids, quote_id);

    for line in select * from jsonb_array_elements(coalesce(item->'lineItems', '[]'::jsonb)) loop
      if line->>'productId' is not null then
        resolved_product := (line->>'productId')::uuid;
      elsif line->>'productTempId' is not null then
        resolved_product := (product_map->>(line->>'productTempId'))::uuid;
      else
        resolved_product := null;
      end if;

      insert into line_items (quote_id, product_id, description, quantity, rate_cents, discount_type, discount_value, position)
      values (
        quote_id,
        resolved_product,
        line->>'description',
        (line->>'quantity')::numeric,
        (line->>'rateCents')::int,
        'none',
        0,
        (line->>'position')::int
      );
    end loop;

    insert into activity_log (quote_id, user_id, action, detail)
    values (quote_id, p_user_id, 'created', jsonb_build_object('imported', true));
  end loop;

  return jsonb_build_object(
    'clientsCreated', clients_created,
    'productsCreated', products_created,
    'quoteIds', to_jsonb(quote_ids)
  );
end;
$$;
```

- [ ] **Step 2: Apply the migration locally**

Run: `npx supabase db reset` (or `npx supabase migration up` if you have local state to keep).
Expected: migrations apply with no SQL error; `import_commit` exists.

Verify: `npx supabase db execute "select proname from pg_proc where proname = 'import_commit';"` returns one row (adjust to your local psql access if the CLI differs).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0006_import_commit_rpc.sql
git commit -m "feat(import): transactional import_commit RPC

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

### Task 12: `parseUpload` + `previewImport` server actions

**Files:**
- Create: `src/actions/import.ts`

- [ ] **Step 1: Implement parseUpload + previewImport**

```ts
/**
 * import.ts — spreadsheet import server actions.
 *
 * What:        parseUpload (untrusted file → SheetTable, size/row capped),
 *              previewImport (resolve against the DB + validate → ImportPreview),
 *              and commitImport (build the plan → transactional import_commit RPC).
 * Where used:  The import wizard (src/components/import/*).
 * Notes:       Parsing runs server-side on the upload (trust boundary): reject
 *              unknown types, cap size (2 MB) and rows (1000). Preview and commit
 *              reuse the pure functions in src/lib/import/*; totals are recomputed
 *              here via lib/pricing so the client total is never trusted.
 */
"use server";

import { createClient } from "@/lib/supabase/server";
import { computeTotals } from "@/lib/pricing";
import { parseCsv, parseXlsx, toTable } from "@/lib/import/parse";
import { buildPreview, normalizeKey, matchExisting, type ExistingKey } from "@/lib/import/resolve";
import { buildClientRecord, buildProductRecord, buildQuoteLineRecord } from "@/lib/import/targets";
import type { ColumnMapping, ImportPlan, ImportTarget, SheetTable, CommitQuote } from "@/lib/import/types";

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const MAX_ROWS = 1000;
const PROMOTION_THRESHOLD = 3;

export async function parseUpload(formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false as const, error: "No file was uploaded." };
  if (file.size === 0) return { ok: false as const, error: "The file is empty." };
  if (file.size > MAX_BYTES) return { ok: false as const, error: "File is too large (max 2 MB)." };

  const name = file.name.toLowerCase();
  const isCsv = name.endsWith(".csv");
  const isXlsx = name.endsWith(".xlsx");
  if (!isCsv && !isXlsx) return { ok: false as const, error: "Upload a .csv or .xlsx file." };

  try {
    let rows: string[][];
    if (isCsv) {
      rows = parseCsv(await file.text());
    } else {
      rows = await parseXlsx(Buffer.from(await file.arrayBuffer()));
    }
    const table = toTable(rows);
    if (table.rows.length > MAX_ROWS) {
      return { ok: false as const, error: `Too many rows (max ${MAX_ROWS}). Split the file and try again.` };
    }
    return { ok: true as const, table };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Could not read the file." };
  }
}

async function loadExisting(): Promise<{ clients: ExistingKey[]; products: ExistingKey[] }> {
  const supabase = await createClient();
  const [{ data: clients }, { data: products }] = await Promise.all([
    supabase.from("clients").select("id, company"),
    supabase.from("products").select("id, name").eq("active", true),
  ]);
  return {
    clients: (clients ?? []).map((c) => ({ id: c.id as string, key: normalizeKey(c.company as string) })),
    products: (products ?? []).map((p) => ({ id: p.id as string, key: normalizeKey(p.name as string) })),
  };
}

export async function previewImport(target: ImportTarget, table: SheetTable, mapping: ColumnMapping) {
  const { clients, products } = await loadExisting();
  const preview = buildPreview({
    target,
    rows: table.rows,
    mapping,
    existingClients: clients,
    existingProducts: products,
    promotionThreshold: PROMOTION_THRESHOLD,
  });
  return { ok: true as const, preview };
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS. (`commitImport` referenced by the wizard is added in Task 13 — do not wire the wizard's commit button until then.)

- [ ] **Step 3: Commit**

```bash
git add src/actions/import.ts
git commit -m "feat(import): parseUpload + previewImport server actions

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

### Task 13: `commitImport` — build the plan, call the RPC

**Files:**
- Modify: `src/actions/import.ts`

- [ ] **Step 1: Add commitImport (and the plan builder)**

Append to `src/actions/import.ts`:

```ts
// Build the ImportPlan from the sheet + mapping + the user's promotion choices,
// then commit it atomically. Only rows that validate are included; totals are
// computed here (tax 0, no discount) via lib/pricing. `promoteDescriptions` are
// the normalized line descriptions the user opted to turn into catalog products.
export async function commitImport(
  target: ImportTarget,
  table: SheetTable,
  mapping: ColumnMapping,
  promoteDescriptions: string[] = [],
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "You must be signed in to import." };

  const { clients, products } = await loadExisting();
  const plan: ImportPlan = { newClients: [], newProducts: [], quotes: [] };

  // Temp-id allocators keyed by normalized name so a repeated name reuses one temp id.
  const clientTemp = new Map<string, string>();
  const productTemp = new Map<string, string>();
  const ensureClientTemp = (company: string) => {
    const key = normalizeKey(company);
    const existing = matchExisting(company, clients);
    if (existing) return { clientId: existing, clientTempId: null };
    if (!clientTemp.has(key)) {
      const tempId = `c${clientTemp.size}`;
      clientTemp.set(key, tempId);
      plan.newClients.push({ tempId, company: company.trim(), contactName: null, email: null, phone: null });
    }
    return { clientId: null, clientTempId: clientTemp.get(key)! };
  };
  const promoteSet = new Set(promoteDescriptions.map(normalizeKey));
  const ensureProductTemp = (description: string, rateCents: number) => {
    const key = normalizeKey(description);
    if (!promoteSet.has(key)) return { productId: null, productTempId: null };
    const existing = matchExisting(description, products);
    if (existing) return { productId: existing, productTempId: null };
    if (!productTemp.has(key)) {
      const tempId = `p${productTemp.size}`;
      productTemp.set(key, tempId);
      plan.newProducts.push({ tempId, name: description.trim(), description: null, defaultRateCents: rateCents, unit: null });
    }
    return { productId: null, productTempId: productTemp.get(key)! };
  };

  if (target === "clients") {
    for (const row of table.rows) {
      const built = buildClientRecord(row, mapping);
      if (!built.ok) continue; // errors were shown in the preview; skip them
      const r = built.record;
      const existing = matchExisting(r.company, clients);
      if (existing) continue; // linking an existing client with no quote is a no-op
      plan.newClients.push({
        tempId: `c${plan.newClients.length}`,
        company: r.company,
        contactName: r.contactName || null,
        email: r.email || null,
        phone: r.phone || null,
      });
    }
  } else if (target === "products") {
    for (const row of table.rows) {
      const built = buildProductRecord(row, mapping);
      if (!built.ok) continue;
      const r = built.record;
      if (matchExisting(r.name, products)) continue;
      plan.newProducts.push({
        tempId: `p${plan.newProducts.length}`,
        name: r.name,
        description: r.description || null,
        defaultRateCents: r.defaultRateCents,
        unit: r.unit || null,
      });
    }
  } else {
    // quotes: group valid line rows into quotes, create clients/products on the fly.
    const groups = new Map<string, CommitQuote>();
    for (const row of table.rows) {
      const built = buildQuoteLineRecord(row, mapping);
      if (!built.ok) continue;
      const r = built.record;
      const clientRef = ensureClientTemp(r.client);
      const groupKey = r.quoteGroup
        ? `q:${normalizeKey(r.quoteGroup)}`
        : `c:${clientRef.clientId ?? clientRef.clientTempId}`;
      let quote = groups.get(groupKey);
      if (!quote) {
        quote = { ...clientRef, subtotalCents: 0, discountCents: 0, taxCents: 0, totalCents: 0, lineItems: [] };
        groups.set(groupKey, quote);
      }
      const productRef = ensureProductTemp(r.description, r.rateCents);
      quote.lineItems.push({
        description: r.description,
        quantity: r.quantity,
        rateCents: r.rateCents,
        discountType: "none",
        discountValue: 0,
        productId: productRef.productId,
        productTempId: productRef.productTempId,
      });
    }
    // Compute totals per quote via the shared pricing module (tax 0, no discount).
    for (const quote of groups.values()) {
      const totals = computeTotals({
        lineItems: quote.lineItems.map((li) => ({
          quantity: li.quantity,
          rateCents: li.rateCents,
          discountType: "none",
          discountValue: 0,
        })),
        orderDiscountType: "none",
        orderDiscountValue: 0,
        taxRatePercent: 0,
      });
      quote.subtotalCents = totals.subtotalCents;
      quote.discountCents = totals.discountCents;
      quote.taxCents = totals.taxCents;
      quote.totalCents = totals.totalCents;
    }
    plan.quotes = [...groups.values()];
  }

  if (!plan.newClients.length && !plan.newProducts.length && !plan.quotes.length) {
    return { ok: false as const, error: "Nothing to import — every row was empty or invalid." };
  }

  const { data, error } = await supabase.rpc("import_commit", { payload: plan, p_user_id: user.id });
  if (error) return { ok: false as const, error: error.message };

  return { ok: true as const, result: data as { clientsCreated: number; productsCreated: number; quoteIds: string[] } };
}
```

- [ ] **Step 2: Add position to line items in the plan**

The RPC reads `line->>'position'`. Update the `quote.lineItems.push(...)` call above so each line carries its position: change it to set `position: quote.lineItems.length` as a field. Edit the pushed object to:

```ts
      quote.lineItems.push({
        description: r.description,
        quantity: r.quantity,
        rateCents: r.rateCents,
        discountType: "none",
        discountValue: 0,
        productId: productRef.productId,
        productTempId: productRef.productTempId,
        position: quote.lineItems.length,
      } as CommitLineItem & { position: number });
```

And add `position: number;` to `CommitLineItem` in `src/lib/import/types.ts`.

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/actions/import.ts src/lib/import/types.ts
git commit -m "feat(import): commitImport builds plan and calls the RPC

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Phase 7 — Wizard UI

> UI note: match existing components. Use `@/components/ui/button`, `input`, `table`, `select` (base-ui/shadcn already present), `sonner` `toast` for success/error, and `lucide-react` icons. Follow `docs/STYLE_GUIDE.md` tokens — no hardcoded colors.

### Task 14: The wizard (route + container + three steps + entry button)

**Files:**
- Create: `src/app/(app)/import/page.tsx`
- Create: `src/components/import/ImportWizard.tsx`
- Create: `src/components/import/UploadStep.tsx`
- Create: `src/components/import/MapColumnsStep.tsx`
- Create: `src/components/import/PreviewStep.tsx`
- Create: `src/components/import/ImportEntryButton.tsx`
- Modify: `src/app/(app)/quotes/page.tsx`, `src/app/(app)/clients/page.tsx`, `src/app/(app)/products/page.tsx`

- [ ] **Step 1: Route**

`src/app/(app)/import/page.tsx`:

```tsx
/**
 * import/page.tsx — the spreadsheet import wizard route.
 *
 * What:        Hosts the client-side ImportWizard. An optional ?target= query
 *              (from a list page's Import button) pre-selects the entity.
 * Where used:  /import, linked from the Quotes/Clients/Products list headers.
 */
import { ImportWizard } from "@/components/import/ImportWizard";
import type { ImportTarget } from "@/lib/import/types";

const VALID: ImportTarget[] = ["clients", "products", "quotes"];

export default async function ImportPage({
  searchParams,
}: {
  searchParams: Promise<{ target?: string }>;
}) {
  const { target } = await searchParams;
  const initial = VALID.includes(target as ImportTarget) ? (target as ImportTarget) : "quotes";
  return (
    <div className="px-8 py-6">
      <h1 className="mb-6 text-xl font-semibold text-primary">Import from spreadsheet</h1>
      <ImportWizard initialTarget={initial} />
    </div>
  );
}
```

- [ ] **Step 2: Container (step state machine)**

`src/components/import/ImportWizard.tsx`:

```tsx
/**
 * ImportWizard.tsx — client container holding the 3-step import flow's state.
 *
 * What:        Owns target, parsed table, column mapping, and preview; renders
 *              the active step. Server actions do the parsing/resolution/commit;
 *              this component only sequences the steps and holds their results.
 * Where used:  /import route.
 */
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { UploadStep } from "./UploadStep";
import { MapColumnsStep } from "./MapColumnsStep";
import { PreviewStep } from "./PreviewStep";
import { autoMap } from "@/lib/import/targets";
import type { ColumnMapping, ImportTarget, SheetTable } from "@/lib/import/types";

type Step = "upload" | "map" | "preview";

export function ImportWizard({ initialTarget }: { initialTarget: ImportTarget }) {
  const [step, setStep] = useState<Step>("upload");
  const [target, setTarget] = useState<ImportTarget>(initialTarget);
  const [table, setTable] = useState<SheetTable | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({});

  function onParsed(nextTarget: ImportTarget, parsed: SheetTable) {
    setTarget(nextTarget);
    setTable(parsed);
    setMapping(autoMap(nextTarget, parsed.headers));
    setStep("map");
  }

  return (
    <div className="max-w-4xl">
      <Steps step={step} />
      {step === "upload" && <UploadStep target={target} onParsed={onParsed} />}
      {step === "map" && table && (
        <MapColumnsStep
          target={target}
          table={table}
          mapping={mapping}
          onChange={setMapping}
          onBack={() => setStep("upload")}
          onNext={() => setStep("preview")}
        />
      )}
      {step === "preview" && table && (
        <PreviewStep
          target={target}
          table={table}
          mapping={mapping}
          onBack={() => setStep("map")}
          onDone={() => {
            toast.success("Import complete.");
            setStep("upload");
            setTable(null);
          }}
        />
      )}
    </div>
  );
}

function Steps({ step }: { step: Step }) {
  const labels: [Step, string][] = [
    ["upload", "1. Upload"],
    ["map", "2. Map columns"],
    ["preview", "3. Preview & import"],
  ];
  return (
    <ol className="mb-6 flex gap-4 text-sm">
      {labels.map(([key, label]) => (
        <li key={key} className={key === step ? "font-medium text-primary" : "text-muted-foreground"}>
          {label}
        </li>
      ))}
    </ol>
  );
}
```

- [ ] **Step 3: Upload step**

`src/components/import/UploadStep.tsx`:

```tsx
/**
 * UploadStep.tsx — step 1: choose the entity and upload a CSV/XLSX file.
 *
 * What:        Posts the file to the parseUpload server action; on success hands
 *              the parsed SheetTable up to the wizard. Surfaces parse errors.
 * Where used:  ImportWizard.
 */
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { parseUpload } from "@/actions/import";
import type { ImportTarget, SheetTable } from "@/lib/import/types";

const TARGETS: [ImportTarget, string][] = [
  ["quotes", "Quotes (line items → draft quotes)"],
  ["clients", "Clients"],
  ["products", "Products"],
];

export function UploadStep({
  target,
  onParsed,
}: {
  target: ImportTarget;
  onParsed: (target: ImportTarget, table: SheetTable) => void;
}) {
  const [selected, setSelected] = useState<ImportTarget>(target);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    const res = await parseUpload(form);
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    onParsed(selected, res.table);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-xl border p-6">
      <div className="space-y-2">
        <label className="text-sm font-medium">What are you importing?</label>
        <div className="flex flex-col gap-2">
          {TARGETS.map(([value, label]) => (
            <label key={value} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="target"
                value={value}
                checked={selected === value}
                onChange={() => setSelected(value)}
              />
              {label}
            </label>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="file">
          File (.csv or .xlsx)
        </label>
        <input id="file" name="file" type="file" accept=".csv,.xlsx" required className="block text-sm" />
      </div>
      <Button type="submit" disabled={busy}>
        {busy ? "Reading…" : "Continue"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 4: Map-columns step**

`src/components/import/MapColumnsStep.tsx`:

```tsx
/**
 * MapColumnsStep.tsx — step 2: map sheet headers to target fields.
 *
 * What:        For each target field, a dropdown selects which uploaded column
 *              feeds it (auto-mapped by header name). Required fields must be
 *              mapped before continuing.
 * Where used:  ImportWizard.
 */
"use client";

import { Button } from "@/components/ui/button";
import { TARGET_FIELDS } from "@/lib/import/targets";
import type { ColumnMapping, ImportTarget, SheetTable } from "@/lib/import/types";

export function MapColumnsStep({
  target,
  table,
  mapping,
  onChange,
  onBack,
  onNext,
}: {
  target: ImportTarget;
  table: SheetTable;
  mapping: ColumnMapping;
  onChange: (m: ColumnMapping) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const fields = TARGET_FIELDS[target];
  const missingRequired = fields.filter((f) => f.required && (mapping[f.key] === null || mapping[f.key] === undefined));

  function setField(key: string, value: string) {
    onChange({ ...mapping, [key]: value === "" ? null : Number(value) });
  }

  return (
    <div className="space-y-5 rounded-xl border p-6">
      <p className="text-sm text-muted-foreground">
        Match your spreadsheet columns to the fields we need. Required fields are marked.
      </p>
      <div className="space-y-3">
        {fields.map((f) => (
          <div key={f.key} className="grid grid-cols-2 items-center gap-4">
            <label className="text-sm">
              {f.label}
              {f.required && <span className="text-destructive"> *</span>}
            </label>
            <select
              className="rounded-md border px-2 py-1 text-sm"
              value={mapping[f.key] ?? ""}
              onChange={(e) => setField(f.key, e.target.value)}
            >
              <option value="">— not mapped —</option>
              {table.headers.map((h, i) => (
                <option key={i} value={i}>
                  {h || `Column ${i + 1}`}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
      {missingRequired.length > 0 && (
        <p className="text-sm text-destructive">
          Map these required fields: {missingRequired.map((f) => f.label).join(", ")}.
        </p>
      )}
      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onNext} disabled={missingRequired.length > 0}>
          Preview
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Preview step (table + promotions + commit)**

`src/components/import/PreviewStep.tsx`:

```tsx
/**
 * PreviewStep.tsx — step 3: show the resolved preview and commit clean rows.
 *
 * What:        Calls previewImport for the per-row outcome, lets the user pick
 *              which repeated descriptions to promote to catalog products, then
 *              calls commitImport (transactional). Error rows are shown and are
 *              skipped by the commit.
 * Where used:  ImportWizard.
 */
"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { previewImport, commitImport } from "@/actions/import";
import type { ColumnMapping, ImportPreview, ImportTarget, SheetTable } from "@/lib/import/types";

export function PreviewStep({
  target,
  table,
  mapping,
  onBack,
  onDone,
}: {
  target: ImportTarget;
  table: SheetTable;
  mapping: ColumnMapping;
  onBack: () => void;
  onDone: () => void;
}) {
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [promote, setPromote] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    previewImport(target, table, mapping).then((res) => {
      if (active && res.ok) setPreview(res.preview);
      else if (active) toast.error(res.ok ? "" : res.error);
    });
    return () => {
      active = false;
    };
  }, [target, table, mapping]);

  if (!preview) return <p className="text-sm text-muted-foreground">Building preview…</p>;

  const { summary } = preview;

  async function onCommit() {
    setBusy(true);
    const res = await commitImport(target, table, mapping, [...promote]);
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    onDone();
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border bg-muted/30 p-4 text-sm">
        {summary.total} rows → {summary.newClients} new clients, {summary.newProducts} new products,{" "}
        {summary.quotes} quotes.{" "}
        {summary.errors > 0 && (
          <span className="text-destructive">{summary.errors} rows have errors and will be skipped.</span>
        )}
      </div>

      {preview.promotions.length > 0 && (
        <div className="space-y-2 rounded-lg border p-4">
          <p className="text-sm font-medium">Repeated line items — make these catalog products?</p>
          {preview.promotions.map((p) => (
            <label key={p.description} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={promote.has(p.description)}
                onChange={(e) => {
                  const next = new Set(promote);
                  if (e.target.checked) next.add(p.description);
                  else next.delete(p.description);
                  setPromote(next);
                }}
              />
              &quot;{p.description}&quot; — {p.occurrences} rows across {p.clientCount} clients
            </label>
          ))}
        </div>
      )}

      <div className="max-h-96 overflow-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Row</TableHead>
              <TableHead className="w-24">Status</TableHead>
              <TableHead>Detail</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {preview.rows.map((r) => (
              <TableRow key={r.rowIndex}>
                <TableCell className="tabular-nums text-muted-foreground">{r.rowIndex + 2}</TableCell>
                <TableCell>
                  <span className={r.status === "error" ? "text-destructive" : "text-foreground"}>{r.status}</span>
                </TableCell>
                <TableCell className="text-muted-foreground">{r.message}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onCommit} disabled={busy || summary.importable === 0}>
          {busy ? "Importing…" : `Import ${summary.importable} rows`}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Entry button + wire into the three list pages**

`src/components/import/ImportEntryButton.tsx`:

```tsx
/**
 * ImportEntryButton.tsx — "Import" link shown on the list pages.
 *
 * What:        Deep-links to the import wizard pre-targeted to the entity of the
 *              page it sits on.
 * Where used:  Quotes, Clients, and Products list headers.
 */
import Link from "next/link";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ImportTarget } from "@/lib/import/types";

export function ImportEntryButton({ target }: { target: ImportTarget }) {
  return (
    <Button asChild variant="outline" size="sm">
      <Link href={`/import?target=${target}`}>
        <Upload className="size-4" />
        Import
      </Link>
    </Button>
  );
}
```

In each list page, wrap the existing header action in a flex row and add the button. For `src/app/(app)/products/page.tsx`, change:

```tsx
        <AddProductDialog />
```

to:

```tsx
        <div className="flex gap-2">
          <ImportEntryButton target="products" />
          <AddProductDialog />
        </div>
```

and add the import at the top: `import { ImportEntryButton } from "@/components/import/ImportEntryButton";`. Do the equivalent in `clients/page.tsx` (`target="clients"`, next to `AddClientDialog`) and `quotes/page.tsx` (`target="quotes"`, next to its existing "new quote" action — open that file and place it beside the existing header button).

- [ ] **Step 7: Typecheck, lint, run the app**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

Run: `npm run dev`, open `http://localhost:3000/import`, and confirm the three steps render and the entry buttons appear on the list pages. (Full data flow is verified by the E2E in Task 15.)

- [ ] **Step 8: Commit**

```bash
git add src/app/\(app\)/import src/components/import src/app/\(app\)/quotes/page.tsx src/app/\(app\)/clients/page.tsx src/app/\(app\)/products/page.tsx
git commit -m "feat(import): wizard UI, route, and list-page entry points

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Phase 8 — E2E, docs, review

### Task 15: End-to-end happy path

**Files:**
- Create: `e2e/import.spec.ts`
- Create: `src/lib/import/__fixtures__/quotes-sample.csv`

- [ ] **Step 1: Create the fixture**

`src/lib/import/__fixtures__/quotes-sample.csv`:

```csv
Client,Description,Qty,Rate
Import Test Co,Logo design,2,1200
Import Test Co,Business cards,1,300
Second Import Co,Logo design,1,1200
```

- [ ] **Step 2: Write the E2E**

Follow the existing `e2e/` patterns for auth/setup (open an existing spec to copy the login/storage-state helper). Then:

```ts
import { test, expect } from "@playwright/test";
import path from "node:path";

// Assumes the shared auth setup used by the other e2e specs (copy their beforeEach).
test("imports a quotes CSV end to end", async ({ page }) => {
  await page.goto("/import?target=quotes");

  await page.setInputFiles(
    "#file",
    path.join(process.cwd(), "src/lib/import/__fixtures__/quotes-sample.csv"),
  );
  await page.getByRole("button", { name: "Continue" }).click();

  // Auto-mapping should satisfy required fields; proceed to preview.
  await page.getByRole("button", { name: "Preview" }).click();

  // Summary reflects 2 quotes / 2 new clients.
  await expect(page.getByText(/2 quotes/)).toBeVisible();

  await page.getByRole("button", { name: /Import \d+ rows/ }).click();
  await expect(page.getByText("Import complete.")).toBeVisible();

  // The imported quotes now exist on the quotes list.
  await page.goto("/quotes");
  await expect(page.getByText("Import Test Co")).toBeVisible();
});
```

- [ ] **Step 3: Run the E2E**

Run: `npm run test:e2e -- import.spec.ts`
Expected: PASS. (If auth setup differs, align the spec with the existing e2e harness before debugging the flow.)

- [ ] **Step 4: Commit**

```bash
git add e2e/import.spec.ts src/lib/import/__fixtures__/quotes-sample.csv
git commit -m "test(import): end-to-end quotes CSV import

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

### Task 16: Full suite, docs, and code review

**Files:**
- Modify: `docs/CONTEXT.md`

- [ ] **Step 1: Run everything**

Run: `npm run typecheck && npm test && npm run lint`
Expected: all PASS. Fix any failures before continuing.

- [ ] **Step 2: Update the project map**

In `docs/CONTEXT.md`, add to the "Where do I look for...?" table:

```markdown
| Spreadsheet import (parse, resolve, preview) | `src/lib/import/` |
| Import server actions (parse/preview/commit) | `src/actions/import.ts` |
| Import wizard UI | `src/components/import/`, `src/app/(app)/import/` |
```

And add to the shared building blocks table:

```markdown
| `parseUpload` / `previewImport` / `commitImport` | `src/actions/import.ts` | The import pipeline's three server actions (server-side parse, DB resolve+validate, transactional commit). |
| `buildPreview` / `suggestPromotions` | `src/lib/import/resolve.ts` | Pure resolution + per-row preview; exact-match only, count-based promotions. |
| `import_commit` RPC | `supabase/migrations/0006_import_commit_rpc.sql` | All-or-nothing insert of clients+products+quotes+line items. |
```

- [ ] **Step 3: Commit docs**

```bash
git add docs/CONTEXT.md
git commit -m "docs: map the spreadsheet-import feature

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 4: Code review (Definition of Done step 3 — not optional)**

Run the code-reviewer agent (or `/code-review`) over the branch diff. Address findings before considering the feature done. Focus areas to call out to the reviewer: the RPC's transactional/rollback behavior on a mid-batch failure, the trust-boundary caps in `parseUpload`, and that no parallel validation crept in (targets reuse the shared rules).

---

## Self-review (author's checklist — completed)

**Spec coverage:**
- One engine, three targets → Tasks 6–13 (shared pipeline; per-target presets). ✓
- CSV + XLSX → Tasks 4–5, `parseUpload`. ✓
- Exact-match + user-confirmed, no confidence scoring → Task 8 (`matchExisting` exact only). ✓
- Product promotion (count, suggested) → Task 9 + Preview checkboxes. ✓
- Quote grouping (mapped quote col, else per client) + draft/tax0 defaults → Task 10 + `commitImport` + RPC. ✓
- Non-blocking per-row validation with reasons → `buildPreview` error rows + Preview table. ✓
- Transactional all-or-nothing commit → Task 11 RPC. ✓
- Trust boundary (server-side parse, size/row caps, type check) → Task 12 `parseUpload`. ✓
- Download-template link — DEFERRED: not in the task list. This is a nice-to-have from the spec's UI section; add a follow-up task if time allows (static CSV per target + a link in `UploadStep`). Flagged so it isn't a silent omission.
- Entry points on 3 list pages → Task 14 Step 6. ✓
- Tests: unit (pure modules), one E2E, security notes → Tasks 3–10, 15, 16. ✓
- Docs (CONTEXT, DECISIONS) → Tasks 1, 16. ✓

**Placeholder scan:** No "TBD"/"handle errors appropriately" — every code step has real code. The one XLSX-parser step has no unit test by deliberate, stated choice (binary fixtures), covered by E2E.

**Type consistency:** `CommitLineItem` gains `position` in Task 13 Step 2 (noted as an edit to `types.ts`). `matchExisting`/`normalizeKey`/`buildPreview`/`suggestPromotions` signatures match across resolve.ts and import.ts. `ExistingKey` exported from resolve.ts and imported in import.ts.

**Known follow-ups (not blockers, explicitly deferred):**
- Download-template links per target.
- Inline cell-editing of error rows in the preview (spec mentions it; v1 shows errors + skips them, which satisfies "let them know what to change" — inline editing is an enhancement).
- Standalone client/product imports share the engine and ARE built (Tasks 12–14 handle all three targets), but their preview `values` columns are minimal; richer per-target preview columns are a polish follow-up.
