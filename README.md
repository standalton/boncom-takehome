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
- **Spreadsheet import** — a 3-step import wizard (upload → map columns → preview
  & commit, transactional) is fully built and tested, but **intentionally kept
  off the nav** to keep the demo path focused; reach it at `/import`.
- **Correct-by-construction math** — all pricing lives in one pure, unit-tested
  module (`src/lib/pricing.ts`) used by both the live UI and the server on save,
  so the displayed total and the stored total can never diverge.
- **Three-layer validation** — the same Zod rules enforced in the UI, in server
  actions, and by database CHECK constraints (e.g. no >100% discount).

## Running locally (optional)

**To evaluate the app, just use the [live demo](#live-demo) above — no setup
required.** Local setup is only needed for development, and requires your own
Supabase backend (the app talks to Supabase for data and auth).

```bash
npm install
cp .env.example .env.local   # fill in your Supabase project URL + anon key
npm run dev                  # http://localhost:3000
```

The full schema and demo data live in `supabase/` — `migrations/` (applied in
order) and `seed.sql` (3 demo users + a catalog, clients, and ~75 quotes). With
the [Supabase CLI](https://supabase.com/docs/guides/local-development) you can
run `supabase db reset` against a local stack to apply both. Note the seed
inserts Supabase Auth users, so it needs a Supabase database (local or hosted),
not a plain Postgres.

### Scripts

```bash
npm test            # unit + component tests (pricing, money, validation, PDF, inputs, …)
npm run test:e2e    # Playwright end-to-end (core create -> save -> persist flow)
npm run typecheck   # tsc --noEmit
npm run build       # production build
```

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
