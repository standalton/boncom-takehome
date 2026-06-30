# Decisions Log

Short, dated entries recording meaningful choices made while building this
project — stack, libraries, architecture, and notable tradeoffs. The brief asks
specifically about *the decisions behind the build*; this is where they live.

Format: newest first.

---

## 2026-06-30 — Estimate app design locked

Full design: `docs/superpowers/specs/2026-06-30-estimate-app-design.md`. Headline
decisions and the reasoning behind them:

- **Supabase as source of truth** (Postgres + Auth + RLS + Realtime) on a new
  dedicated project (~$10/mo, deletable after the interview). One service covers
  DB, the 3-user login, security, and realtime. *Why:* paper-trail/record-keeping
  needs a real DB; Supabase bundles what we need with least setup.
- **Shared team workspace, not per-user silos.** All authenticated users see/edit
  everything; changes are attributed via `created_by`/`updated_by`. *Why:* agencies
  collaborate on the same client quotes; simpler than isolation and makes the
  audit log meaningful.
- **Tax applied after discount; both % and fixed discounts at line and order
  level; one tax rate per estimate; math in integer cents.** *Why:* you don't tax
  money the customer didn't pay; cents avoid float drift; per-line tax is YAGNI.
- **No tax/money libraries.** Tax is a user-entered rate (not jurisdictional
  compliance); integer-cent math is exact. `lib/pricing` stays dependency-free.
- **Snapshot pricing on line items; append-only audit log; stored totals on the
  quote.** *Why:* sent quotes must not change when a product's price later changes;
  an editable audit trail isn't an audit trail; stored totals make the dashboard
  fast and record the figure at save time.
- **Supabase Realtime over socket.io** for the "new version available" toast.
  *Why:* socket.io can't run on Vercel's serverless model and would need a separate
  always-on server; Realtime is already in the stack and free.
- **shadcn/ui + Tabler icons** over Mantine/HeroUI. *Why:* prebuilt + accessible
  but fully re-brandable to the Boncom look; Tabler icons natively supported.
- **Explicit save (not autosave); Export (not Send).** *Why:* estimates are
  deliberate documents — explicit saves give clean audit entries; we have no email
  integration, so a downloadable document is the honest, useful action.
- **Phased build, core-first.** Phase 1 fully satisfies the brief on its own;
  enhancements (duplicate, catalog, per-line discounts, pipeline, timeline, export,
  realtime) and the AI generator layer on only if the core is airtight.

## 2026-06-30 — Testing, security, and review workflow

- **Decision:** Adopt a multi-layer testing strategy (unit, integration, E2E,
  type-checking, accessibility, performance) plus defensive security testing
  (dependency and secret scanning, static analysis, per-feature OWASP review,
  pentest-style checks on sensitive flows). Every feature must pass tests and a
  code review before it is considered done.
- **Why:** Quality, security, and edge-case handling are explicit grading
  signals; baking the discipline into the conventions ensures it is applied from
  the first feature rather than retrofitted.
- **Note:** Concrete test frameworks are deferred until the stack is chosen, to
  avoid speculative setup.

## 2026-06-30 — Match Boncom brand for the UI

- **Decision:** Adopt Boncom's external brand (boncom.com) as the project's
  visual language — navy `#002042` + cyan `#65C6D9` on white, Open Sans
  typography, minimal/editorial aesthetic. Captured as tokens in
  `STYLE_GUIDE.md`.
- **Why:** Boncom is a branding/communications agency; building the demo in
  their visual language demonstrates brand-consistency thinking, which is core
  to the AI Solutions Manager role.
- **Note:** Boncom uses Open Sans, a free Google Font, so the typography can be
  matched exactly with no licensing concern.

## 2026-06-30 — Repository conventions established

- **Decision:** Adopt a modular, small-file architecture with per-file header
  comments, a separate rules file (`CLAUDE.md`) and project map (`CONTEXT.md`),
  and this decisions log.
- **Why:** Keep the codebase navigable and easy for a new developer to adopt;
  make the reasoning behind the build explicit for the interview panel.
