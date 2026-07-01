# Decisions Log

Short, dated entries recording meaningful choices made while building this
project — stack, libraries, architecture, and notable tradeoffs. The brief asks
specifically about *the decisions behind the build*; this is where they live.

Format: newest first.

## 2026-06-30 — Discount validation + already-sent handling

- **Decision:** A fixed order discount larger than the subtotal is now rejected
  (shared `orderDiscountExceedsSubtotal` in lib/pricing) rather than silently
  clamped — surfaced live in the editor (inline error + Save/Finalize disabled)
  and re-checked authoritatively in saveQuote. Percentage caps (≤100%) stay in
  the Zod schema, with a live mirror for the order-level percent.
- **Why:** Silently clamping changes the number the user typed. The rule lives in
  one shared helper so the editor and server can't disagree.
- **Already sent:** A post-send quote shows an informational banner ("Sent to
  {client}"), and re-sending routes through the send dialog with a warning +
  confirm ("already sent … will notify the client again") instead of firing
  silently. Editing stays locked server-side (draft-only).

## 2026-06-30 — Enforce the quote lifecycle server-side

- **Decision:** The quote lock is enforced in the server actions, not just the
  UI. `saveQuote` writes only while a quote is a `draft`, and `setStatus` only
  performs transitions the `lib/quote-status` state machine permits. Both use
  conditional UPDATEs (`.eq("status","draft")` / `.in("status", …)`) so the
  check and the write are a single, race-free statement.
- **Why:** Server actions are real endpoints an authenticated user can call
  directly, bypassing the disabled/read-only UI. The OWASP item "authorize
  protected actions server-side" (see `CLAUDE.md`) requires the trust boundary
  to be the server, not the browser.
- **Tradeoff:** `deleteQuote` is intentionally left unrestricted by status —
  deletion is a legitimate action at any stage, already scoped by RLS to the
  workspace and confirmed in the UI. Restricting it would need matching UI
  changes for no real safety gain in an internal tool.

## 2026-06-30 — Show quote history from the existing activity log

- **Decision:** Surface the append-only `activity_log` as a read-only timeline
  (`QuoteActivity`) at the bottom of the quote document, fetched server-side via
  `listActivity`.
- **Why:** The audit data was already being written on create/save/status
  changes but never shown; a lightweight timeline makes a quote's history
  visible with no schema or write-path changes.
- **Note:** Timestamps render in UTC on the server/first paint and upgrade to
  the viewer's local time after mount, avoiding a hydration mismatch.

## 2026-06-30 — Record what each save changed, not just "saved"

- **Decision:** `saveQuote` snapshots the quote's prior state, diffs it against
  the incoming edit (`lib/quote-changes.summarizeChanges`), and stores concrete
  change strings ("Set tax rate to 8%", "Added 1 line item") in the activity
  log. A no-op save records nothing.
- **Why:** The history previously showed a wall of identical "Edits saved" rows
  — useless for understanding what happened. Field-level changes are exact;
  line-item edits collapse to "Edited line items" because items are replaced as
  an ordered list with no stable identity across saves (per-line matching would
  be a fragile guess).
- **Note:** History moved into the header actions menu ("View history") rather
  than sitting below the quote body.
- **Follow-up:** Line items now persist their originating catalog `product_id`
  (earlier deferred as YAGNI). It earns its keep: the change log can report
  "Applied catalog item 'X'" instead of a bare "rate changed" when a line is
  filled from the catalog, which is what actually happened.

---

## 2026-06-30 — Sending a quote is a confirmed action

- **Decision:** Changing a quote's status to "Sent" opens a confirmation modal
  (`SendQuoteDialog`) previewing the recipient (company + contact, email, phone)
  with Send / Cancel; confirming advances the status and toasts who it went to.
  Other status transitions apply immediately. Added a `title` column (0004) for a
  short quote description shown under the number, and toasts now render
  bottom-right in the light theme (they were inheriting the OS dark theme).
- **Why:** "Sent" is the one status with real-world consequence, so it deserves a
  deliberate step rather than a silent dropdown change; the preview makes it
  obvious who the quote is going to. Status pills are tinted by state so the
  pipeline reads at a glance.

## 2026-06-30 — A client is a company (contact attached)

- **Decision:** Reframe a client as a **company** (the billable entity, required)
  with optional contact details — contact name, email, phone. Migration `0003`
  renames the old person `name` to `contact_name`, backfills/locks `company` as
  NOT NULL, and adds `phone`. Lists and the customer picker lead with company,
  contact shown as a subtitle.
- **Why:** Agencies quote *companies*, not individuals; the company is the stable
  identity and a quote bills to it. Contact info hangs off that.

## 2026-06-30 — Customer picker is a select-style combobox

- **Decision:** The closed customer field is a button (`Combobox.Trigger` +
  `Combobox.Value`), not a text input; the search box lives inside the open
  popup. Consolidated the two client-create dialogs into one (`NewClientDialog`),
  reused by both the picker and the clients page.
- **Why:** A text input on the closed field showed a blinking caret, making a
  selected customer look editable. A button trigger reads as a picker and only
  becomes a search field when open. One dialog avoids divergent create forms.

## 2026-06-30 — Standardize on "quote"; editable quote number

- **Decision:** Use "quote" consistently in the UI (the product is *kwik-quote*)
  and switch the auto-generated number prefix from `EST-` to `QUO-` via migration
  `0002`, migrating existing rows. The quote number is now user-editable in the
  editor; the DB `unique` constraint is the backstop and a duplicate surfaces a
  friendly error (no silent failure).
- **Why:** The earlier copy mixed "estimate" and "quote", and the `EST-` prefix
  contradicted the product name. Agencies often want to set their own quote
  references, so the number is editable rather than fixed.

## 2026-06-30 — Searchable customer picker with inline create

- **Decision:** Replace the native client `<select>` with a Base UI Combobox
  (`ClientPicker`) that filters as you type and has a pinned "Add new customer"
  action opening `NewClientDialog`; the created client is selected immediately.
- **Why:** Selecting a client is the first step of every quote; a searchable
  picker scales past a handful of clients, and inline creation removes a
  context-switch to the Clients page mid-quote.

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
- **Three-layer validation** (Zod rules shared across UI, Server Action, and DB
  CHECK constraints). *Why:* rules like "discount can't exceed 100%" must hold
  even if the UI is bypassed — defined once, enforced everywhere.
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
