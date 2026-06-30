# Project Map (AI / Developer Index)

A fast index of this codebase. Read this first to find where something lives
*without* reading every file. For the working *rules*, see `../CLAUDE.md`.

> Keep this file in sync. Any file added, moved, or removed updates the relevant
> section here in the same change. A stale map is worse than no map.

---

## What this project is

_To be filled in once the brief is started: a one-paragraph description of the
app, its purpose, and the core user-facing capability._

## Tech stack

_To be filled in once chosen. List language, framework, key libraries, and why
(cross-reference `DECISIONS.md`)._

## How to run

_To be filled in: install, dev, build, test commands._

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
