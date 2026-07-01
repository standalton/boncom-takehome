# kwik-quote

**Quick, accurate client estimates.** A web app for building and managing client
cost estimates — line items with live, always-correct totals, discounts, tax, a
status pipeline, and a who-changed-what audit trail. Replaces the error-prone
spreadsheet workflow where formulas are rebuilt and tax math is checked by hand.

Boncom take-home for the AI Solutions Manager role.

## Live demo

**→ https://kwik-quote.vercel.app**

1. Open the link above.
2. On the login screen, click **Sarah**, **Mike**, or **Alex** under
   "Demo — one-tap sign in" for instant access (no typing needed). The password
   field has a show/hide toggle if you enter credentials by hand.
3. You land on the **Dashboard**. From the sidebar, browse **Quotes**,
   **Clients**, and **Products**; open any quote (or hit **New quote**) to watch
   the grand total update live as you edit line items, discounts, and tax.

Prefer to type credentials? Use `sarah@kwikquote.app` (or `mike@kwikquote.app` /
`alex@kwikquote.app`), password `Demo!2026` — all three share it.

## What's built

- **Auth** — Supabase email/password with one-tap demo login for three seeded
  users; a show/hide toggle on the password field.
- **Dashboard** — lifecycle-aware metrics (open pipeline, won + win rate,
  awaiting reply, drafts), a pipeline breakdown, and the most recent quotes.
- **Quote editor** — pick a client (or add one inline), add line items from the
  product catalog or free-hand, apply **per-line discounts** *and* an order-level
  discount (% or $) plus tax; the **grand total updates live as you type**.
  Explicit save.
- **Status pipeline** — an enforced state machine (draft → finalized → sent →
  accepted → paid / declined) with a status control in the editor, a send
  confirmation, and reopen-to-draft. Transitions are validated server-side.
- **Per-quote history** — the who-changed-what audit trail is surfaced in the UI
  as a "View history" timeline; every create / save / status change is recorded.
- **PDF export** — a real vector PDF of the quote, downloadable from the send
  dialog (`@react-pdf/renderer`).
- **Duplicate & delete** — clone a quote as a new draft, or delete it.
- **Clients & Products** — reusable client records (with inline quote history) and
  a full product catalog (create / edit / soft-delete); shared team workspace.
- **Lists** — search, column sort, status/unit filters, and pagination across
  quotes, clients, and products.
- **Responsive & snappy** — works on desktop and mobile (the sidebar collapses
  into a slide-in drawer on small screens); navigation paints instant loading
  skeletons while data streams, and auth is verified locally per request
  (`getClaims`) so there's no round-trip on every click.
- **Spreadsheet import** — a 3-step import wizard (upload → map columns → preview
  & commit, transactional) is fully built and tested, but **intentionally kept
  off the nav** to keep the demo path focused; reach it at `/import`.
- **Correct-by-construction math** — all pricing lives in one pure, unit-tested
  module (`src/lib/pricing.ts`) used by both the live UI and the server on save,
  so the displayed total and the stored total can never diverge.
- **Three-layer validation** — the same Zod rules enforced in the UI, in server
  actions, and by database CHECK constraints (e.g. no >100% discount).

## Reviewing the code

**To use the app, just open the [live demo](#live-demo) — no setup required.**

If you're reading the repo, these verify the engineering on a fresh clone with
**no database or environment setup**:

```bash
npm install
npm test        # 150 unit + component tests (pricing, validation, PDF, inputs, …)
npm run typecheck
npm run build
```

Running the full app locally needs a Supabase backend; the schema and demo data
live in `supabase/` (`migrations/` + `seed.sql`), and the end-to-end flow is
covered by `npm run test:e2e` (Playwright).

## Tech stack

Next.js (App Router) + TypeScript · Supabase (Postgres, Auth, RLS) · Tailwind +
shadcn/ui (Lucide icons) · Zod · Vitest + Playwright · deployed on Vercel.

## What I'd do next

A few things are designed for in the spec but intentionally deferred:

- **Realtime collaboration** — live "a newer version was sent" notifications via
  Supabase Realtime. Today the editor computes and warns about sent siblings on
  load, but there's no live subscription pushing changes between open sessions.
- **AI assist** — "draft my line items from a project description" to jump-start
  a quote from plain text.
- **Polish** — surface the import wizard in the nav once it's part of the demo
  path, and a visual stepper for the status pipeline.

## Project docs

- [`docs/superpowers/specs/`](docs/superpowers/specs/) — design spec (architecture, data model, build plan).
- [`docs/superpowers/plans/`](docs/superpowers/plans/) — the implementation plan this was built from.
- [`docs/DECISIONS.md`](docs/DECISIONS.md) — log of meaningful build decisions and the reasoning.
- [`docs/CONTEXT.md`](docs/CONTEXT.md) — project map: where everything lives.
- [`docs/STYLE_GUIDE.md`](docs/STYLE_GUIDE.md) — design tokens, matched to the Boncom brand.
- [`CLAUDE.md`](CLAUDE.md) — working conventions for contributors (human and AI).
