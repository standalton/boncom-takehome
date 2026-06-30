# kwik-quote

**Quick, accurate client estimates.** A web app for building and managing client
cost estimates — line items with live, always-correct totals, discounts, tax, a
status pipeline, and a who-changed-what audit trail. Replaces the error-prone
spreadsheet workflow where formulas are rebuilt and tax math is checked by hand.

Boncom take-home for the AI Solutions Manager role.

## What's built

- **Auth** — Supabase email/password with one-tap demo login for three seeded users.
- **Estimates dashboard** — list with status, totals, search; create new estimates.
- **Quote editor** — pick a client, add line items, set an order discount (% or $)
  and tax; the **grand total updates live as you type**. Explicit save.
- **Clients** — reusable client records (shared team workspace).
- **Correct-by-construction math** — all pricing lives in one pure, unit-tested
  module (`src/lib/pricing.ts`) used by both the live UI and the server on save,
  so the displayed total and the stored total can never diverge.
- **Three-layer validation** — the same Zod rules enforced in the UI, in server
  actions, and by database CHECK constraints (e.g. no >100% discount).
- **Audit trail** — every create/save/status-change is recorded per quote.

## Demo accounts

On the login screen, click **Sarah**, **Mike**, or **Alex** for one-tap sign-in.
(Credentials, if you prefer: `sarah@kwikquote.app` / `Demo!2026`.)

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in your Supabase project URL + anon key
npm run dev                  # http://localhost:3000
```

Database schema and seed data live in `supabase/` (`migrations/0001_init.sql`,
`seed.sql`).

### Scripts

```bash
npm test            # unit tests (pricing, money, validation)
npm run test:e2e    # Playwright end-to-end (core create -> save -> persist flow)
npm run typecheck   # tsc --noEmit
npm run build       # production build
```

## Tech stack

Next.js (App Router) + TypeScript · Supabase (Postgres, Auth, RLS) · Tailwind +
shadcn/ui (Lucide icons) · Zod · Vitest + Playwright · deployed on Vercel.

## What I'd do next (Phase 2/3)

Per-line discount UI, a product catalog picker, duplicate-quote, the full
status pipeline with a visual stepper, the audit timeline surfaced in the UI,
PDF export, realtime "newer version" notifications (Supabase Realtime), and an
AI "draft my line items from a project description" assist. These are designed
for in the spec and intentionally deferred to keep the core airtight.

## Project docs

- [`docs/superpowers/specs/`](docs/superpowers/specs/) — design spec (architecture, data model, build plan).
- [`docs/superpowers/plans/`](docs/superpowers/plans/) — the implementation plan this was built from.
- [`docs/DECISIONS.md`](docs/DECISIONS.md) — log of meaningful build decisions and the reasoning.
- [`docs/CONTEXT.md`](docs/CONTEXT.md) — project map: where everything lives.
- [`docs/STYLE_GUIDE.md`](docs/STYLE_GUIDE.md) — design tokens, matched to the Boncom brand.
- [`CLAUDE.md`](CLAUDE.md) — working conventions for contributors (human and AI).
