# kwik-quote — Phase 0 + Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the core of kwik-quote — authenticated users create, edit, and persist client cost estimates with live, always-correct totals — satisfying the take-home brief on its own.

**Architecture:** Next.js (App Router) + TypeScript on Vercel; Supabase for Postgres, Auth, and RLS. All money math lives in a pure, unit-tested `lib/pricing` module called by both the browser (live totals) and the server (authoritative totals on save). Mutations go through typed Server Actions that validate (shared Zod schemas), recompute totals, stamp attribution, and append an audit entry. UI is shadcn/ui + Tailwind themed to the Boncom brand, with Tabler icons.

**Tech Stack:** Next.js 15, TypeScript, Supabase (`@supabase/supabase-js`, `@supabase/ssr`), Tailwind, shadcn/ui, `@tabler/icons-react`, Zod, Vitest, Playwright.

**Scope:** Phase 0 (foundation) + Phase 1 (core). Phases 2 (duplicate, catalog, per-line discounts, pipeline, timeline, export, realtime) and 3 (AI generation) are separate plans. Full design: `docs/superpowers/specs/2026-06-30-estimate-app-design.md`.

---

## File Structure (Phase 0 + 1)

```
src/
  lib/
    pricing.ts            Pure money math (the single source of truth)
    pricing.test.ts       Exhaustive unit tests for pricing
    validation.ts         Shared Zod schemas (UI + server)
    validation.test.ts    Unit tests for validation rules
    money.ts              Cents <-> display formatting helpers
    money.test.ts         Tests for formatting
    supabase/
      client.ts           Browser Supabase client
      server.ts           Server Supabase client (cookies)
      middleware.ts       Session refresh helper
    types.ts              Shared TS types (Quote, LineItem, Client, etc.)
  app/
    layout.tsx            Root layout (fonts, Toaster)
    globals.css           Tailwind + brand tokens
    login/page.tsx        Sign-in + one-tap demo login
    (app)/
      layout.tsx          Authenticated shell (sidebar + header); guards session
      page.tsx            Dashboard (quote list + search)
      clients/page.tsx    Clients list + create
      quotes/[id]/page.tsx  Quote editor (server load -> client editor)
      quotes/new/page.tsx   New quote
  components/
    app-shell/Sidebar.tsx, Header.tsx
    ui/...                shadcn-generated components (owned)
    HelpHint.tsx          Tooltip system
    MoneyInput.tsx
    TotalsPanel.tsx
    DiscountControl.tsx
    LineItemRow.tsx
    ClientSelect.tsx
  actions/
    quotes.ts             Server Actions: createQuote, saveQuote, getQuote, listQuotes
    clients.ts            Server Actions: createClient, listClients
middleware.ts             Next.js middleware (auth session refresh)
supabase/
  migrations/0001_init.sql  Schema, enums, constraints, RLS, sequence
  seed.sql                  Realistic demo data
vitest.config.ts
playwright.config.ts
e2e/core-flow.spec.ts
.env.example
components.json            shadcn config (iconLibrary: @tabler/icons-react)
```

---

## PHASE 0 — Foundation

### Task 1: Scaffold the Next.js app

**Files:**
- Create: project files via CLI (package.json, tsconfig, src/app/*, etc.)
- Modify: `.gitignore` (merge, keep our entries)

- [ ] **Step 1: Scaffold Next.js into the repo**

Run in the repo root:
```bash
npx create-next-app@latest . --typescript --tailwind --app --src-dir --eslint --use-npm --no-turbopack
```
When prompted about non-empty directory / conflicting files, keep our `README.md`, `CLAUDE.md`, `docs/`. If the CLI refuses, scaffold into `./_app` then move generated files into the root and delete `_app`.

- [ ] **Step 2: Verify it runs**

Run: `npm run dev`
Expected: dev server starts at `http://localhost:3000` with the default page.

- [ ] **Step 3: Merge .gitignore**

Ensure `.gitignore` keeps our existing entries plus Next's (`.next/`, `node_modules/`, `.env*`). Remove duplicates.

- [ ] **Step 4: Commit**
```bash
git add -A
git commit -m "chore: scaffold Next.js app (TS, Tailwind, App Router)"
```

### Task 2: Install dependencies and init shadcn with Tabler icons

**Files:**
- Create: `components.json`
- Modify: `package.json`

- [ ] **Step 1: Install libraries**
```bash
npm i @supabase/supabase-js @supabase/ssr zod sonner @tabler/icons-react
npm i -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @playwright/test
```

- [ ] **Step 2: Init shadcn**
```bash
npx shadcn@latest init
```
Choose defaults; base color neutral.

- [ ] **Step 3: Set Tabler as the icon library**

In `components.json`, set `"iconLibrary": "@tabler/icons-react"`.

- [ ] **Step 4: Add the components we need**
```bash
npx shadcn@latest add button input label card table dialog dropdown-menu select badge tooltip sonner skeleton textarea
```

- [ ] **Step 5: Commit**
```bash
git add -A
git commit -m "chore: add deps, init shadcn with Tabler icons"
```

### Task 3: Vitest config

**Files:**
- Create: `vitest.config.ts`

- [ ] **Step 1: Write the config**
```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
```

- [ ] **Step 2: Add test script**

In `package.json` scripts add: `"test": "vitest run"`, `"test:watch": "vitest"`.

- [ ] **Step 3: Verify**

Run: `npm run test`
Expected: PASS with "No test files found" (or 0 tests) — confirms config loads.

- [ ] **Step 4: Commit**
```bash
git add -A && git commit -m "chore: add vitest config"
```

### Task 4: The pricing module (TDD — the crown jewel)

**Files:**
- Create: `src/lib/pricing.ts`
- Test: `src/lib/pricing.test.ts`

- [ ] **Step 1: Write the failing tests**
```ts
// src/lib/pricing.test.ts
import { describe, it, expect } from "vitest";
import { computeTotals, type PricingInput } from "./pricing";

const line = (quantity: number, rateCents: number, discountType: "none" | "percent" | "fixed" = "none", discountValue = 0) =>
  ({ quantity, rateCents, discountType, discountValue });

describe("computeTotals", () => {
  it("computes a simple subtotal with no discounts or tax", () => {
    const input: PricingInput = {
      lineItems: [line(2, 150000), line(1, 200000)],
      orderDiscountType: "none", orderDiscountValue: 0, taxRatePercent: 0,
    };
    const r = computeTotals(input);
    expect(r.subtotalCents).toBe(500000);
    expect(r.totalCents).toBe(500000);
  });

  it("applies per-line %, order %, and tax after discount (the locked case)", () => {
    const input: PricingInput = {
      lineItems: [line(1, 400000, "percent", 15), line(1, 150000)],
      orderDiscountType: "percent", orderDiscountValue: 10, taxRatePercent: 7,
    };
    const r = computeTotals(input);
    expect(r.subtotalCents).toBe(490000);   // 340000 + 150000
    expect(r.discountCents).toBe(49000);    // 10% of 490000
    expect(r.taxCents).toBe(30870);         // 7% of 441000
    expect(r.totalCents).toBe(471870);      // $4,718.70
  });

  it("clamps a fixed discount that exceeds the base to never go negative", () => {
    const r = computeTotals({
      lineItems: [line(1, 10000, "fixed", 99999)],
      orderDiscountType: "none", orderDiscountValue: 0, taxRatePercent: 0,
    });
    expect(r.subtotalCents).toBe(0);
    expect(r.totalCents).toBe(0);
  });

  it("returns zero for an empty estimate", () => {
    const r = computeTotals({ lineItems: [], orderDiscountType: "none", orderDiscountValue: 0, taxRatePercent: 0 });
    expect(r.subtotalCents).toBe(0);
    expect(r.totalCents).toBe(0);
  });

  it("handles fractional quantity and rounds to cents", () => {
    const r = computeTotals({
      lineItems: [line(1.5, 10001)], orderDiscountType: "none", orderDiscountValue: 0, taxRatePercent: 0,
    });
    expect(r.subtotalCents).toBe(15002); // round(1.5 * 10001) = round(15001.5) = 15002
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- src/lib/pricing.test.ts`
Expected: FAIL ("Cannot find module './pricing'" / computeTotals not defined).

- [ ] **Step 3: Implement the pricing module**
```ts
// src/lib/pricing.ts
export type DiscountType = "none" | "percent" | "fixed";

export interface PricingLineItem {
  quantity: number;       // may be fractional
  rateCents: number;      // integer cents
  discountType: DiscountType;
  discountValue: number;  // percent (0-100) when "percent"; cents when "fixed"
}

export interface PricingInput {
  lineItems: PricingLineItem[];
  orderDiscountType: DiscountType;
  orderDiscountValue: number;
  taxRatePercent: number;
}

export interface PricingResult {
  lineNetsCents: number[];
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
}

const clampNonNegative = (n: number) => (n < 0 ? 0 : n);

function applyDiscount(baseCents: number, type: DiscountType, value: number): number {
  if (type === "percent") {
    const pct = Math.min(Math.max(value, 0), 100);
    return Math.round(baseCents * (pct / 100));
  }
  if (type === "fixed") {
    return Math.min(clampNonNegative(Math.round(value)), baseCents);
  }
  return 0;
}

export function computeTotals(input: PricingInput): PricingResult {
  const lineNetsCents = input.lineItems.map((li) => {
    const gross = Math.round(li.quantity * li.rateCents);
    const safeGross = clampNonNegative(gross);
    const discount = applyDiscount(safeGross, li.discountType, li.discountValue);
    return clampNonNegative(safeGross - discount);
  });

  const subtotalCents = lineNetsCents.reduce((a, b) => a + b, 0);
  const discountCents = applyDiscount(subtotalCents, input.orderDiscountType, input.orderDiscountValue);
  const taxableCents = clampNonNegative(subtotalCents - discountCents);
  const taxCents = Math.round(taxableCents * (Math.max(input.taxRatePercent, 0) / 100));
  const totalCents = clampNonNegative(taxableCents + taxCents);

  return { lineNetsCents, subtotalCents, discountCents, taxCents, totalCents };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- src/lib/pricing.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**
```bash
git add src/lib/pricing.ts src/lib/pricing.test.ts
git commit -m "feat: pricing module with full unit tests (tax-after-discount, cents, clamping)"
```

### Task 5: Money formatting helpers (TDD)

**Files:**
- Create: `src/lib/money.ts`
- Test: `src/lib/money.test.ts`

- [ ] **Step 1: Write failing tests**
```ts
// src/lib/money.test.ts
import { describe, it, expect } from "vitest";
import { formatCents, dollarsToCents } from "./money";

describe("money", () => {
  it("formats cents as USD", () => {
    expect(formatCents(471870)).toBe("$4,718.70");
    expect(formatCents(0)).toBe("$0.00");
  });
  it("converts a dollar string to integer cents", () => {
    expect(dollarsToCents("4000")).toBe(400000);
    expect(dollarsToCents("19.99")).toBe(1999);
    expect(dollarsToCents("")).toBe(0);
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `npm run test -- src/lib/money.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**
```ts
// src/lib/money.ts
const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function formatCents(cents: number): string {
  return USD.format(cents / 100);
}

export function dollarsToCents(input: string): number {
  if (!input.trim()) return 0;
  const n = Number(input);
  if (Number.isNaN(n)) return 0;
  return Math.round(n * 100);
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm run test -- src/lib/money.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/lib/money.ts src/lib/money.test.ts
git commit -m "feat: money formatting helpers with tests"
```

### Task 6: Validation schemas (TDD)

**Files:**
- Create: `src/lib/validation.ts`
- Test: `src/lib/validation.test.ts`

- [ ] **Step 1: Write failing tests**
```ts
// src/lib/validation.test.ts
import { describe, it, expect } from "vitest";
import { lineItemSchema, quoteSchema } from "./validation";

const validLine = { description: "Workshop", quantity: 1, rateCents: 400000, discountType: "percent", discountValue: 15 };

describe("validation", () => {
  it("accepts a valid line item", () => {
    expect(lineItemSchema.safeParse(validLine).success).toBe(true);
  });
  it("rejects a percentage discount over 100", () => {
    expect(lineItemSchema.safeParse({ ...validLine, discountValue: 110 }).success).toBe(false);
  });
  it("rejects a negative rate", () => {
    expect(lineItemSchema.safeParse({ ...validLine, rateCents: -1 }).success).toBe(false);
  });
  it("rejects quantity of zero", () => {
    expect(lineItemSchema.safeParse({ ...validLine, quantity: 0 }).success).toBe(false);
  });
  it("rejects a quote with no client", () => {
    const r = quoteSchema.safeParse({ clientId: "", taxRatePercent: 7, orderDiscountType: "none", orderDiscountValue: 0, lineItems: [validLine], notes: "" });
    expect(r.success).toBe(false);
  });
  it("rejects a tax rate over 100", () => {
    const r = quoteSchema.safeParse({ clientId: "c1", taxRatePercent: 101, orderDiscountType: "none", orderDiscountValue: 0, lineItems: [validLine], notes: "" });
    expect(r.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `npm run test -- src/lib/validation.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**
```ts
// src/lib/validation.ts
import { z } from "zod";

const discountType = z.enum(["none", "percent", "fixed"]);

const discountRefinement = (data: { discountType: z.infer<typeof discountType>; discountValue: number }) =>
  data.discountType !== "percent" || data.discountValue <= 100;

export const lineItemSchema = z
  .object({
    description: z.string().min(1, "Description is required"),
    quantity: z.number().positive("Quantity must be greater than 0"),
    rateCents: z.number().int().min(0, "Rate cannot be negative"),
    discountType,
    discountValue: z.number().min(0, "Discount cannot be negative"),
  })
  .refine(discountRefinement, { message: "Percentage discount cannot exceed 100%", path: ["discountValue"] });

export const quoteSchema = z
  .object({
    clientId: z.string().min(1, "A client is required"),
    taxRatePercent: z.number().min(0).max(100, "Tax rate must be between 0 and 100"),
    orderDiscountType: discountType,
    orderDiscountValue: z.number().min(0),
    lineItems: z.array(lineItemSchema),
    notes: z.string().optional().default(""),
  })
  .refine((q) => q.orderDiscountType !== "percent" || q.orderDiscountValue <= 100, {
    message: "Percentage discount cannot exceed 100%",
    path: ["orderDiscountValue"],
  });

export type QuoteInput = z.infer<typeof quoteSchema>;
export type LineItemInput = z.infer<typeof lineItemSchema>;
```

- [ ] **Step 4: Run to verify pass**

Run: `npm run test -- src/lib/validation.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**
```bash
git add src/lib/validation.ts src/lib/validation.test.ts
git commit -m "feat: shared Zod validation schemas with tests"
```

### Task 7: Create the Supabase project and wire env

**Files:**
- Create: `.env.local` (gitignored), `.env.example`, `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/middleware.ts`, `middleware.ts`

- [ ] **Step 1: Create the project**

Create a new Supabase project in the "Vacationaire" org named `kwik-quote` (confirmed $10/mo). Use the Supabase dashboard or MCP. Record the project URL and anon/publishable key.

- [ ] **Step 2: Write `.env.example`**
```bash
# .env.example
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key   # server-only, never exposed to client
```
Copy to `.env.local` and fill real values.

- [ ] **Step 3: Browser client**
```ts
// src/lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

- [ ] **Step 4: Server client**
```ts
// src/lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          try { toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch {}
        },
      },
    },
  );
}
```

- [ ] **Step 5: Middleware session refresh**
```ts
// src/lib/supabase/middleware.ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );
  await supabase.auth.getUser();
  return response;
}
```
```ts
// middleware.ts (repo root)
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|login|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
```

- [ ] **Step 6: Commit**
```bash
git add -A
git commit -m "feat: supabase clients + auth session middleware + env example"
```

### Task 8: Database schema migration

**Files:**
- Create: `supabase/migrations/0001_init.sql`

- [ ] **Step 1: Write the migration**
```sql
-- supabase/migrations/0001_init.sql

-- Enums
create type quote_status as enum ('draft','sent','accepted','paid','declined');
create type discount_type as enum ('none','percent','fixed');

-- profiles (display names for auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  created_at timestamptz not null default now()
);

-- clients
create table clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text,
  email text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- products (catalog) — used in Phase 2 but created now
create table products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  default_rate_cents integer not null default 0 check (default_rate_cents >= 0),
  unit text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- quote number sequence
create sequence quote_number_seq start 1;

-- quotes
create table quotes (
  id uuid primary key default gen_random_uuid(),
  number text not null unique default ('EST-' || lpad(nextval('quote_number_seq')::text, 4, '0')),
  client_id uuid not null references clients(id),
  status quote_status not null default 'draft',
  tax_rate numeric(5,2) not null default 0 check (tax_rate >= 0 and tax_rate <= 100),
  discount_type discount_type not null default 'none',
  discount_value numeric(12,2) not null default 0 check (discount_value >= 0),
  notes text,
  valid_until date,
  subtotal_cents integer not null default 0 check (subtotal_cents >= 0),
  discount_cents integer not null default 0 check (discount_cents >= 0),
  tax_cents integer not null default 0 check (tax_cents >= 0),
  total_cents integer not null default 0 check (total_cents >= 0),
  created_by uuid references profiles(id),
  updated_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- line_items
create table line_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references quotes(id) on delete cascade,
  product_id uuid references products(id),
  description text not null,
  quantity numeric(12,3) not null check (quantity > 0),
  rate_cents integer not null check (rate_cents >= 0),
  discount_type discount_type not null default 'none',
  discount_value numeric(12,2) not null default 0 check (discount_value >= 0),
  position integer not null default 0
);

-- activity_log (append-only)
create table activity_log (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references quotes(id) on delete cascade,
  user_id uuid references profiles(id),
  action text not null,
  detail jsonb,
  created_at timestamptz not null default now()
);

-- RLS: shared workspace (any authenticated user); activity_log append-only
alter table profiles enable row level security;
alter table clients enable row level security;
alter table products enable row level security;
alter table quotes enable row level security;
alter table line_items enable row level security;
alter table activity_log enable row level security;

create policy "auth read profiles" on profiles for select to authenticated using (true);

create policy "auth all clients"   on clients     for all to authenticated using (true) with check (true);
create policy "auth all products"  on products    for all to authenticated using (true) with check (true);
create policy "auth all quotes"    on quotes      for all to authenticated using (true) with check (true);
create policy "auth all lineitems" on line_items  for all to authenticated using (true) with check (true);

create policy "auth read activity"   on activity_log for select to authenticated using (true);
create policy "auth insert activity" on activity_log for insert to authenticated with check (true);
-- no update/delete policies => append-only
```

- [ ] **Step 2: Apply the migration**

Apply via the Supabase MCP `apply_migration` (name `0001_init`) or `npx supabase db push` against the `kwik-quote` project.

- [ ] **Step 3: Verify**

List tables (Supabase MCP `list_tables` or dashboard). Expected: profiles, clients, products, quotes, line_items, activity_log present.

- [ ] **Step 4: Commit**
```bash
git add supabase/migrations/0001_init.sql
git commit -m "feat: initial database schema with constraints and RLS"
```

### Task 9: Seed the 3 users and demo data

**Files:**
- Create: `supabase/seed.sql`

- [ ] **Step 1: Create the 3 auth users**

In the Supabase dashboard (Authentication > Users) create three users with confirmed emails and known passwords:
`sarah@kwik-quote.demo`, `mike@kwik-quote.demo`, `alex@kwik-quote.demo` (password `Demo!2026`). Note their UUIDs.

- [ ] **Step 2: Write seed.sql**

Insert matching `profiles` rows (Sarah Chen, Mike Rivera, Alex Doyle) using the UUIDs from Step 1, a handful of realistic agency `products` (e.g., Brand Strategy Workshop $4,000 unit "project"; Social Media Package $1,500 unit "month"; Logo Design $2,000; Website Build $12,000; SEO Retainer $1,800 unit "month"), 3–4 `clients`, and 2 sample `quotes` with line items in mixed statuses. Use integer cents for all rate_cents.

- [ ] **Step 3: Apply and verify**

Run the seed against `kwik-quote`. Verify rows exist and the app can later log in as Sarah.

- [ ] **Step 4: Commit**
```bash
git add supabase/seed.sql
git commit -m "feat: seed demo users, products, clients, and sample quotes"
```

---

## PHASE 1 — Core (the deliverable)

### Task 10: Brand tokens + root layout (fonts + Toaster)

**Files:**
- Modify: `src/app/globals.css`, `src/app/layout.tsx`

- [ ] **Step 1: Add brand tokens**

In `globals.css`, set the shadcn CSS variables to the Boncom tokens from `docs/STYLE_GUIDE.md` (primary/ink `#002042`, accent `#65C6D9`, text `#292A2C`, line `#BFCED9`), and load Open Sans via `next/font/google`.

- [ ] **Step 2: Root layout with Open Sans + Sonner Toaster**
```tsx
// src/app/layout.tsx
import "./globals.css";
import { Open_Sans } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";

const openSans = Open_Sans({ subsets: ["latin"], variable: "--font-sans" });

export const metadata = { title: "kwik-quote", description: "Quick, accurate client estimates." };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={openSans.variable}>
      <body className="font-sans antialiased">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Verify** — `npm run dev`, confirm Open Sans renders and no errors.

- [ ] **Step 4: Commit**
```bash
git add -A && git commit -m "feat: brand tokens, Open Sans, Sonner toaster"
```

### Task 11: HelpHint tooltip component

**Files:**
- Create: `src/components/HelpHint.tsx`, `src/lib/help-text.ts`

- [ ] **Step 1: Central help text**
```ts
// src/lib/help-text.ts
export const helpText = {
  taxRate: "The tax percentage applied to the discounted subtotal.",
  orderDiscount: "A discount applied to the whole estimate, after line items.",
  lineDiscount: "A discount applied to just this line item.",
  status: "Where this estimate is in your pipeline: draft, sent, accepted, paid, or declined.",
  validUntil: "The date this estimate expires.",
} as const;
```

- [ ] **Step 2: Component**
```tsx
// src/components/HelpHint.tsx
import { IconInfoCircle } from "@tabler/icons-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function HelpHint({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger type="button" aria-label="Help" className="text-muted-foreground hover:text-foreground">
        <IconInfoCircle size={16} />
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">{text}</TooltipContent>
    </Tooltip>
  );
}
```

- [ ] **Step 3: Commit**
```bash
git add -A && git commit -m "feat: HelpHint tooltip system with central help text"
```

### Task 12: Login page + demo quick-login

**Files:**
- Create: `src/app/login/page.tsx`, `src/actions/auth.ts`

- [ ] **Step 1: Auth server action**
```ts
// src/actions/auth.ts
"use server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function signIn(email: string, password: string) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false as const, error: error.message };
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
```

- [ ] **Step 2: Login page (client component)**

Build a centered card with email/password inputs calling `signIn`, plus three one-tap buttons that call `signIn` with the seeded demo credentials (Sarah/Mike/Alex). Show an error toast on failure. Brand-styled per STYLE_GUIDE.

- [ ] **Step 3: Manual test**

Run `npm run dev`, click "Sign in as Sarah" → lands on `/`. Wrong password → error toast.

- [ ] **Step 4: Commit**
```bash
git add -A && git commit -m "feat: login page with demo quick-login"
```

### Task 13: Authenticated shell (sidebar + header + guard)

**Files:**
- Create: `src/app/(app)/layout.tsx`, `src/components/app-shell/Sidebar.tsx`, `src/components/app-shell/Header.tsx`

- [ ] **Step 1: Guarded layout**
```tsx
// src/app/(app)/layout.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/app-shell/Sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 px-8 py-6">{children}</main>
    </div>
  );
}
```

- [ ] **Step 2: Sidebar** — nav links (Dashboard `/`, Quotes `/`, Clients `/clients`, Products `/products`) with Tabler icons and active state; current user + logout (calls `signOut`) pinned at the bottom.

- [ ] **Step 3: Verify** — visiting `/` while logged out redirects to `/login`; logged in shows the shell.

- [ ] **Step 4: Commit**
```bash
git add -A && git commit -m "feat: authenticated app shell with sidebar and session guard"
```

### Task 14: Clients — list + create

**Files:**
- Create: `src/actions/clients.ts`, `src/app/(app)/clients/page.tsx`, `src/components/ClientSelect.tsx`

- [ ] **Step 1: Server actions**
```ts
// src/actions/clients.ts
"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const clientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  company: z.string().optional().default(""),
  email: z.string().email().optional().or(z.literal("")),
});

export async function listClients() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("clients").select("*").order("name");
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, data };
}

export async function createClientRecord(input: unknown) {
  const parsed = clientSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("clients")
    .insert({ ...parsed.data, created_by: user?.id })
    .select()
    .single();
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/clients");
  return { ok: true as const, data };
}
```

- [ ] **Step 2: Clients page** — Server Component listing clients in a shadcn `Table`; an "Add client" dialog (Dialog + form) calling `createClientRecord`, with success/error toasts and an empty state.

- [ ] **Step 3: ClientSelect** — a combobox (shadcn Select or Command) to pick an existing client or open the add-client dialog; used by the quote editor.

- [ ] **Step 4: Manual test** — add a client; it appears; reload persists.

- [ ] **Step 5: Commit**
```bash
git add -A && git commit -m "feat: clients list and create with validation"
```

### Task 15: Quote server actions

**Files:**
- Create: `src/actions/quotes.ts`, `src/lib/types.ts`

- [ ] **Step 1: Shared types** — define `Quote`, `LineItem`, `Client` TS interfaces matching the DB columns in `src/lib/types.ts`.

- [ ] **Step 2: Actions**
```ts
// src/actions/quotes.ts
"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { computeTotals } from "@/lib/pricing";
import { quoteSchema } from "@/lib/validation";

export async function listQuotes(search?: string) {
  const supabase = await createClient();
  let q = supabase.from("quotes").select("*, clients(name)").order("updated_at", { ascending: false });
  if (search) q = q.ilike("number", `%${search}%`);
  const { data, error } = await q;
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, data };
}

export async function getQuote(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("quotes")
    .select("*, clients(*), line_items(*)")
    .eq("id", id)
    .single();
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, data };
}

export async function createQuote(clientId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("quotes")
    .insert({ client_id: clientId, created_by: user?.id, updated_by: user?.id })
    .select()
    .single();
  if (error) return { ok: false as const, error: error.message };
  await supabase.from("activity_log").insert({ quote_id: data.id, user_id: user?.id, action: "created", detail: {} });
  return { ok: true as const, data };
}

export async function saveQuote(id: string, input: unknown) {
  const parsed = quoteSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0].message };
  const q = parsed.data;

  const totals = computeTotals({
    lineItems: q.lineItems.map((li) => ({
      quantity: li.quantity, rateCents: li.rateCents,
      discountType: li.discountType, discountValue: li.discountValue,
    })),
    orderDiscountType: q.orderDiscountType,
    orderDiscountValue: q.orderDiscountValue,
    taxRatePercent: q.taxRatePercent,
  });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { error: upErr } = await supabase.from("quotes").update({
    client_id: q.clientId,
    tax_rate: q.taxRatePercent,
    discount_type: q.orderDiscountType,
    discount_value: q.orderDiscountValue,
    notes: q.notes,
    subtotal_cents: totals.subtotalCents,
    discount_cents: totals.discountCents,
    tax_cents: totals.taxCents,
    total_cents: totals.totalCents,
    updated_by: user?.id,
    updated_at: new Date().toISOString(),
  }).eq("id", id);
  if (upErr) return { ok: false as const, error: upErr.message };

  // Replace line items (delete + reinsert) — simplest correct approach for the editor
  await supabase.from("line_items").delete().eq("quote_id", id);
  if (q.lineItems.length) {
    const { error: liErr } = await supabase.from("line_items").insert(
      q.lineItems.map((li, i) => ({
        quote_id: id, description: li.description, quantity: li.quantity,
        rate_cents: li.rateCents, discount_type: li.discountType,
        discount_value: li.discountValue, position: i,
      })),
    );
    if (liErr) return { ok: false as const, error: liErr.message };
  }

  await supabase.from("activity_log").insert({
    quote_id: id, user_id: user?.id, action: "saved",
    detail: { total_cents: totals.totalCents },
  });

  revalidatePath(`/quotes/${id}`);
  revalidatePath("/");
  return { ok: true as const, totals };
}

export async function setStatus(
  id: string,
  status: "draft" | "sent" | "accepted" | "paid" | "declined",
) {
  // Phase 1 UI exposes only draft/sent; the action accepts all for the Phase 2 pipeline.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("quotes")
    .update({ status, updated_by: user?.id, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  await supabase.from("activity_log").insert({
    quote_id: id, user_id: user?.id, action: "status_changed", detail: { status },
  });
  revalidatePath(`/quotes/${id}`);
  revalidatePath("/");
  return { ok: true as const };
}
```

- [ ] **Step 3: Commit**
```bash
git add -A && git commit -m "feat: quote server actions (create, get, list, save with server-side recompute + audit; status)"
```

### Task 16: Quote editor UI (live totals)

**Files:**
- Create: `src/app/(app)/quotes/[id]/page.tsx`, `src/app/(app)/quotes/new/page.tsx`, `src/components/QuoteEditor.tsx`, `src/components/LineItemRow.tsx`, `src/components/TotalsPanel.tsx`, `src/components/DiscountControl.tsx`, `src/components/MoneyInput.tsx`

- [ ] **Step 1: Editor page (server load)** — `quotes/[id]/page.tsx` calls `getQuote(id)` server-side and renders `<QuoteEditor initial={...} clients={...} />`. `quotes/new/page.tsx` requires a client selection then calls `createQuote` and redirects to `/quotes/[id]`.

- [ ] **Step 2: QuoteEditor (client component)** — holds working state `{ clientId, taxRatePercent, orderDiscount, lineItems[], notes }`; on every change recomputes via `computeTotals` and renders `<TotalsPanel>` live; tracks a `dirty` flag and warns on navigate; header shows client name, quote number, a **status control** (Draft/Sent select in Phase 1, calling `setStatus`), and a **Save** button calling `saveQuote`. On save success: toast "Saved", clear dirty. On error: error toast.

- [ ] **Step 3: LineItemRow** — description input, `MoneyInput` for rate, quantity input, line total (read-only, from `computeTotals` line nets), delete button. "Add custom line" button appends a blank row.

- [ ] **Step 4: TotalsPanel + DiscountControl** — sticky panel showing subtotal, `DiscountControl` (type toggle none/percent/fixed + value with `HelpHint`), tax rate input (with `HelpHint`), tax, and grand total — all from the live `computeTotals` result.

- [ ] **Step 5: MoneyInput** — text input that displays dollars and stores integer cents via `dollarsToCents`/`formatCents`.

- [ ] **Step 6: Manual test** — create a quote, add lines, change qty/rate/discount/tax; totals update instantly and match the locked example; Save; reload; values persist.

- [ ] **Step 7: Commit**
```bash
git add -A && git commit -m "feat: quote editor with live totals and explicit save"
```

### Task 17: Dashboard (quote list + search)

**Files:**
- Create/Modify: `src/app/(app)/page.tsx`

- [ ] **Step 1: Dashboard** — Server Component calling `listQuotes(search)`; renders a `Table` of quotes (number, client name, status badge, total via `formatCents`, updated_at); a search input (URL `?q=`); a "+ New quote" action; and an empty state ("Create your first estimate").

- [ ] **Step 2: Manual test** — dashboard lists seeded + created quotes; search by number filters; clicking a row opens the editor.

- [ ] **Step 3: Commit**
```bash
git add -A && git commit -m "feat: dashboard quote list with search and empty state"
```

### Task 18: Core E2E test

**Files:**
- Create: `playwright.config.ts`, `e2e/core-flow.spec.ts`

- [ ] **Step 1: Playwright config** — base URL `http://localhost:3000`, start `npm run dev` as the webServer.

- [ ] **Step 2: Write the E2E test**

```ts
// e2e/core-flow.spec.ts
import { test, expect } from "@playwright/test";

test("create and persist an estimate", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: /sign in as sarah/i }).click();
  await expect(page).toHaveURL("/");

  await page.getByRole("link", { name: /new quote/i }).click();
  // select a seeded client, add a line item, set rate + qty
  await page.getByLabel(/client/i).click();
  await page.getByRole("option").first().click();
  await page.getByRole("button", { name: /add custom line/i }).click();
  await page.getByPlaceholder(/description/i).first().fill("Brand workshop");
  await page.getByLabel(/rate/i).first().fill("4000");
  await page.getByLabel(/quantity/i).first().fill("1");

  await expect(page.getByTestId("grand-total")).toContainText("$4,000.00");

  await page.getByRole("button", { name: /^save$/i }).click();
  await expect(page.getByText(/saved/i)).toBeVisible();

  await page.reload();
  await expect(page.getByTestId("grand-total")).toContainText("$4,000.00");
});
```

- [ ] **Step 3: Run**

Run: `npx playwright test`
Expected: PASS (requires `.env.local` configured and the seeded Sarah user).

- [ ] **Step 4: Commit**
```bash
git add -A && git commit -m "test: core E2E flow (login, build estimate, save, persist)"
```

### Task 19: Phase 1 wrap — docs, deploy, verify

- [ ] **Step 1:** Update `docs/CONTEXT.md` — fill the "How to run" section (install, env, dev, test commands) and the directory map / "Where do I look" / shared-building-blocks tables with the real paths now that code exists.
- [ ] **Step 2:** Run full checks: `npm run test`, `npx playwright test`, `npx tsc --noEmit`, `npm run build`. All green.
- [ ] **Step 3:** Deploy to Vercel; set the env vars; verify the live login + create-quote flow.
- [ ] **Step 4:** Commit + push.
```bash
git add -A && git commit -m "docs: update CONTEXT run instructions; phase 1 complete"
git push origin main
```

---

## Definition of Done (Phase 1)
Brief satisfied: log in → create estimate for a named client → add line items → live totals → apply tax + discount → save with Draft/Sent status → reload and it persists, attributed to the user. Pricing + validation unit tests green; core E2E green; type-check + build clean; deployed link works.
