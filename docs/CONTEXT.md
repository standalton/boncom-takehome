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
| Currency formatting / parsing | `src/lib/money.ts` |
| Input validation rules (Zod) | `src/lib/validation.ts` |
| shadcn/ui components | `src/components/ui/` |
| App-specific components | `src/components/` |
| Unit tests | colocated `src/**/*.test.ts` |
| E2E tests | `e2e/` |
| _(added as built: server actions, supabase clients, routes)_ | |

---

## Shared / reusable building blocks

_The catalog of reusable components, hooks, and utilities — check here before
building something new, to avoid duplicating what already exists. Format:_

| Name | Location | Purpose |
| ---- | -------- | ------- |
| `computeTotals` | `src/lib/pricing.ts` | Pure estimate math; used by editor (live) and server (save). |
| `formatCents` / `dollarsToCents` | `src/lib/money.ts` | Cents <-> display dollar strings. |
| `lineItemSchema` / `quoteSchema` | `src/lib/validation.ts` | Shared Zod validation (UI + server). |
