# Cost Estimate App — Design Spec

Date: 2026-06-30
Status: Approved design, pending implementation plan
Context: Boncom take-home for the AI Solutions Manager role.

---

## 1. Problem and goal

An agency currently builds client cost estimates in spreadsheets: line items
copied by hand, formulas rebuilt for every quote, tax math checked manually.
We are building a small web app that replaces that workflow — create and manage
client estimates with live, always-correct totals, persistent records, and a
clear audit trail of who changed what.

The core promise: **the math is defined once, in code, and is never wrong
again** — the opposite of the rebuild-and-recheck spreadsheet loop.

## 2. Users and scope

- **Single agency team, shared workspace.** All authenticated users see and
  edit all clients, products, and quotes. Every change is attributed.
- **3 seeded test users** (email/password) so the demo is reliable; no public
  signup.
- Not multi-tenant. No roles/permissions beyond "logged in." User
  administration is handled in the Supabase console, not in-app.

## 3. Tech stack and architecture

| Layer | Choice | Rationale |
| ----- | ------ | --------- |
| Framework | Next.js (App Router) + TypeScript | Native to Vercel; Server Components read, Server Actions write. |
| Data + Auth | Supabase (Postgres + Auth + RLS + Realtime) | One service for DB, the 3-user login, row-level security, and realtime. |
| Hosting | Vercel | Instant deploys + live demo link. |
| UI | Tailwind + shadcn/ui (icon library: `@tabler/icons-react`) | Prebuilt, accessible components we own and brand to Boncom; Tabler icons per preference. |
| Math | Pure TS module `lib/pricing` | Single source of truth for all totals; UI-independent and unit-tested. |
| AI (Phase 3) | Vercel AI SDK + AI Gateway | Line-item generation. |
| Tests | Vitest (unit/integration) + Playwright (E2E) | Per project testing conventions. |

Hosting topology: GitHub (public repo, for review) → Vercel (runs the app) →
Supabase (Postgres + Auth + Realtime). Secrets live in env vars only; a
`.env.example` documents required variables.

Key approach decisions:
- **Server Actions** for mutations (typed functions, no hand-rolled REST layer).
- **Server Components** read directly from Supabase for list/detail screens.
- Client-side Supabase access is avoided so DB access and audit-stamping stay
  on the server.

## 4. Data model

Money is stored as **integer cents** everywhere. Quantities are numeric
(fractional hours allowed). Six tables:

- **`profiles`** — display names for the 3 users (`auth.users` only stores
  email): `id` (→ auth.users) · `full_name` · `created_at`.
- **`clients`** — reusable, shared: `id` · `name` · `company?` · `email?` ·
  `created_by` · `created_at` · `updated_at`.
- **`products`** — the catalog: `id` · `name` · `description?` ·
  `default_rate_cents` · `unit?` · `active` · timestamps.
- **`quotes`** — header: `id` · `number` (EST-0001, via DB sequence) ·
  `client_id` · `status` (draft·sent·accepted·paid·declined) · `tax_rate` ·
  `discount_type` (none·percent·fixed) · `discount_value` · `notes?` ·
  `valid_until?` · `subtotal_cents` · `discount_cents` · `tax_cents` ·
  `total_cents` · `created_by` · `updated_by` · timestamps.
- **`line_items`** — rows: `id` · `quote_id` (cascade) · `product_id?`
  (provenance only) · `description` (snapshot) · `quantity` · `rate_cents`
  (snapshot/override) · `discount_type` · `discount_value` · `position`.
- **`activity_log`** — visible timeline: `id` · `quote_id` (cascade) ·
  `user_id` · `action` · `detail` (jsonb) · `created_at`. Append-only.

Relationships: `clients 1—* quotes 1—* line_items ?— products`;
`quotes 1—* activity_log`; profiles referenced by `created_by`/`updated_by`/
`user_id`.

Integrity rules baked into the model:
- **Snapshot pricing on `line_items`.** `description` and `rate_cents` are
  copied at add-time; `product_id` is kept only as provenance. Changing a
  product's price later never rewrites an existing quote.
- **Stored totals on `quotes`.** A deliberate denormalization: the dashboard
  reads `total_cents` directly, and it records what the total was at save time.
  `lib/pricing` computes them; the server action persists them; line items
  remain the source of truth (totals recomputed on every save, never drift).
- **`activity_log` is append-only.** Insert + read only; no update/delete
  (enforced by RLS). An editable audit trail is not an audit trail.

Access (RLS): all tables readable/writable by authenticated users (shared
workspace), except `activity_log` (insert + read only). `created_by`/
`updated_by` are stamped server-side from the session, never trusted from the
client.

## 5. Calculation rules

```
Line gross   = quantity × rate
Line net     = line gross − line discount (% or fixed, clamped ≥ 0)
Subtotal     = sum of line nets
Order disc   = % or fixed applied to subtotal (clamped ≥ 0)
Taxable      = subtotal − order discount
Tax          = taxable × tax_rate%
Grand total  = taxable + tax    (clamped ≥ 0)
```

Decisions: tax applied **after** discount (you don't tax money the customer
didn't pay); discount supports **both** percentage and fixed-dollar at line and
order level; **one** tax rate per estimate (no per-line tax); all math in
**cents**; every layer clamps so totals never go negative.

Locked test case: two lines ($4,000 with a 15% line discount; $1,500 full) +
10% order discount + 7% tax = **$4,718.70**.

No tax-calculation library: tax is a user-entered rate, not jurisdictional
compliance. No money library: integer-cent arithmetic is exact. `lib/pricing`
stays dependency-free.

## 6. Data flow

`lib/pricing.computeTotals(lineItems, orderDiscount, taxRate)` →
`{ lineNets[], subtotalCents, discountCents, taxCents, totalCents }`. It runs
in two places:
- **Browser** — recomputed on every edit for instant live totals (no network
  round-trip).
- **Server** — recomputed inside `saveQuote` so persisted totals are
  authoritative and never trusted from the client.

Because both call identical code, the displayed total and the stored total
cannot diverge.

Flow end to end:
1. **Read** — dashboard/detail are Server Components reading from Supabase.
2. **Edit** — the editor is a client component holding the working draft in
   React state; each change recomputes totals locally.
3. **Save (explicit)** — client calls Server Action `saveQuote(draft)`: get
   session user → validate (Zod) → recompute totals → write quote + line_items
   in a transaction, stamping attribution → append one `activity_log` entry →
   return saved quote or typed error. A visible "unsaved changes" indicator and
   warn-on-leave guard the explicit-save model.
4. **Realtime** — the editor subscribes to its quote via Supabase Realtime; an
   incoming change where `updated_by ≠ me` shows a "newer version — Refresh"
   toast.

Error handling: Server Actions return `{ ok, data } | { ok:false, error }`;
the client shows error toasts and inline field errors. No silent failures;
totals clamp; no `NaN`.

## 7. Screens and components

Routes:
- `/login` — basic centered, branded sign-in; one-tap demo login for the 3
  seeded users.
- `/` (dashboard) — quote list with status filters and search; landing screen.
- `/quotes/[id]`, `/quotes/new` — the quote editor (core screen).
- `/clients`, `/clients/[id]` — clients list and detail (client's quote
  history).
- `/products` — the catalog.
- `/team` (Phase 2, optional) — read-only team + activity.

Layout: left **sidebar** (Tabler icons + labels, active state, user + logout
pinned bottom; collapses to a drawer on narrow screens) + **slim contextual
header** (page title + the single primary action). Laptop-first. Boncom brand
tokens (`STYLE_GUIDE.md`) applied to the shadcn theme.

Quote editor composition: header (client select/create · quote number ·
interactive status pipeline · Save · Export · unsaved indicator); line-items
table (description · qty · rate · optional per-line discount via progressive
disclosure · line total; add-custom and add-from-catalog; reorder; delete);
sticky totals panel (subtotal · order discount control with %/$ toggle +
presets · tax rate · tax · grand total, all live); meta (notes, valid-until);
activity timeline tab.

Reusable component catalog (also recorded in `CONTEXT.md`): `HelpHint`,
`MoneyInput`, `StatusPipeline`/`StatusBadge`, `DiscountControl`, `LineItemRow`,
`ProductPicker`, `ClientSelect`, `TotalsPanel`, `ActivityTimeline`, `AppShell`/
nav, Sonner `toast` helpers (saved/success/error).

UX system details:
- **Tooltips** are one `HelpHint` component (Tabler info icon + shadcn Tooltip)
  driven by a single `helpText` dictionary, so wording is consistent and
  centrally editable. Applied on every screen.
- **Empty/loading states** are deliberate (e.g., "Create your first estimate"
  CTA, "No history yet" for the timeline, skeletons on load).

## 8. Status lifecycle

```
Draft → Sent → Accepted → Paid
            ↘ Declined → (Revise → Draft) or (Close Lost ✕)
```

Shown as an interactive horizontal pipeline stepper; Declined is an off-pipeline
terminal state. "Sent"/"Paid" are statuses you set (manual), not payment
processing — no Stripe, no email. "Revise" returns a declined quote to Draft;
the audit log records the arc. There is no dedicated Send button; status is
changed through the pipeline control. The actionable export is a downloadable
document, not an email.

## 9. Testing strategy

- **Unit (Vitest):** `lib/pricing` exhaustively (core math, the $4,718.70 case,
  edge cases: empty = $0, discount > subtotal clamps, fractional qty, rounding,
  zero rate, large numbers); Zod schemas; formatting helpers.
- **Integration:** Server Actions (`saveQuote` validates/recomputes/stamps/logs;
  `duplicateQuote` clones; legal status transitions; RLS rejects the
  unauthenticated).
- **E2E (Playwright):** login → create client → build quote (custom + catalog) →
  discount + tax → live total → save → reload persists; duplicate; status
  transitions; export produces a document.
- **Accessibility:** axe on key screens; keyboard nav in the editor table.
- **Security:** `npm audit` + Dependabot; secret push-protection; RLS
  verification; server-side Zod validation + server recompute of totals;
  per-feature OWASP pass (XSS especially in export); AI output validated,
  rate-limited, fails safe.
- **Types:** strict TypeScript, no `any`.

Definition of done per feature: meets requirement + edge cases; tests pass;
code review performed; `CONTEXT.md`/`DECISIONS.md` updated.

## 10. Phased build plan

**Phase 0 — Foundation.** Create Supabase project ($10/mo); scaffold Next.js +
TS + Tailwind + shadcn (Tabler icons); auth wiring; `.env.example`; migrations
+ seed scaffolding; write `lib/pricing` + its unit tests first (TDD).

**Phase 1 — Core (the deliverable; satisfies the brief).** Auth (3 seeded users
+ one-tap demo login, protected routes, RLS); app shell; clients (list +
pick-or-create); quote editor (custom line items, live totals, tax + order
discount, Draft/Sent, Save, persistence, attribution); dashboard (list +
search); realistic seed data; core E2E + a11y. Demoable on its own.

**Phase 2 — High-value (priority order).**
1. Duplicate quote (solves the brief's core pain; cheap).
2. Product catalog + add-from-catalog (snapshot pricing).
3. Per-line discounts + discount presets.
4. Full status pipeline (Accepted/Paid/Declined) + interactive stepper.
5. Visible activity timeline.
6. Export (print-optimized route → PDF).
7. Realtime stale-version toast (demoted to last).
8. (optional) read-only Team view.

**Phase 3 — Differentiator.** AI line-item generation, with rails: editable
suggestions only, structured output, graceful failure.

**Cross-cutting (woven throughout):** tooltip/help system; empty/loading/error
states; toasts; delete/archive rules (block deleting a client with quotes;
quote delete or archive); accessibility; per-feature security + code review;
laptop-first responsive; keep `CONTEXT.md`/`DECISIONS.md` current.

## 11. Out of scope (YAGNI)

Per-line tax rates; multi-currency; teams/roles/permissions; in-app user
admin (reassign/revoke — handled in Supabase); payments/invoicing (Stripe);
field-level diff history; true quote versioning (v1/v2); socket.io (Supabase
Realtime covers it); mobile-optimized layouts (laptop-first); email sending.

## 12. Open items and future enhancements

- **App name** — to be chosen (the brief leaves naming to us); a finishing
  decision.
- Future: client-facing quote history view; discount presets management UI;
  quote versioning; richer team/roles; real PDF generation via
  `@react-pdf/renderer`; email delivery.

## 13. Decisions

Meaningful decisions are logged in `docs/DECISIONS.md` as we build. Key ones
captured during design: Supabase as source of truth; tax-after-discount with
both discount types; snapshot pricing; append-only audit log; shared-workspace
RLS; Supabase Realtime over socket.io; shadcn + Tabler; explicit save; export
over send; phased build with core-first.
