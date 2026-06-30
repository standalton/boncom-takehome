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

_To be filled in once scaffolded: install, dev, build, test commands, and the
required environment variables (see `.env.example`)._

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
| _(e.g. shared UI components)_ | _(e.g. `src/components/`)_ |
| _(e.g. data fetching / API calls)_ | _(e.g. `src/lib/api/`)_ |
| _(e.g. reusable helpers/utilities)_ | _(e.g. `src/lib/utils/`)_ |
| _(e.g. types/models)_ | _(e.g. `src/types/`)_ |
| _(e.g. unit / integration tests)_ | _(e.g. colocated `*.test.ts` or `tests/`)_ |
| _(e.g. E2E tests)_ | _(e.g. `e2e/`)_ |

---

## Shared / reusable building blocks

_The catalog of reusable components, hooks, and utilities — check here before
building something new, to avoid duplicating what already exists. Format:_

| Name | Location | Purpose |
| ---- | -------- | ------- |
| _(populated as built)_ | | |
