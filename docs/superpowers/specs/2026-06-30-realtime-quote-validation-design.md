# Real-time field validation for the quote editor

Date: 2026-06-30
Status: Approved (design)

## Problem

Validation errors in the quote editor surface too late. Per-line rules
(empty description, quantity 0, negative rate, discount > 100%, fixed discount
larger than the line total) are only enforced server-side in `saveQuote`, so the
user discovers them as a toast *after* pressing Save. Only the order-level
discount is checked live today (`use-quote-editor.ts` `validationError`, shown in
`AdjustmentsCard`).

We want familiar, real-time field validation: an invalid field highlights red
and shows an inline message, using the conventional "reward early, punish late"
timing.

## Goals

- Every schema-validated field surfaces its own inline error next to the field.
- Timing: **validate on blur, then re-validate live** once a field has errored
  ("reward early, punish late" — the Stripe/GitHub/GOV.UK convention).
- Save/Finalize stay **enabled**. Clicking with outstanding errors reveals all
  invalid fields (turns them red) and scrolls to the first one, instead of
  silently toasting. This is the big-company standard and is simpler/more
  accessible than a disabled button.
- No duplication of validation rules — reuse the existing Zod schemas so the UI
  and server can never disagree.

## Non-goals

- No form-library migration (react-hook-form/Formik). The form stays plain
  `useState`.
- No new validation *rules*. `validation.ts` already defines what "valid" means;
  this work changes *when and how* those rules are shown.
- No change to server-side re-validation — it remains the authoritative backstop.

## Approach

Drive per-field errors from the **existing Zod schemas** (`lineItemSchema`,
`quoteSchema` in `src/lib/validation.ts`). Map each Zod issue's `path` to a UI
field. One source of truth; guaranteed to match the server.

Rejected alternatives:
- Hand-written per-field validators in components — duplicates the schema rules
  and will drift from the server.
- react-hook-form + zodResolver — a large rewrite of a working form for no
  proportional gain.

## Design

### New unit: `src/lib/quote-errors.ts` (+ `quote-errors.test.ts`)

A pure function that translates the schemas into a UI-shaped error map. Keeping
this out of `validation.ts` preserves that file's single purpose (schema
definitions); this file owns the mapping/presentation concern.

```ts
export type FieldErrors = {
  clientId?: string;
  taxRatePercent?: string;
  orderDiscount?: string;
  // Keyed by the editor line `key` (stable across reorders), not array index.
  lines: Record<string, LineFieldErrors>;
};
export type LineFieldErrors = {
  description?: string;
  quantity?: string;
  rateCents?: string;
  discountValue?: string;
};

// `lineKeys[i]` is the editor key for lineItems[i], so Zod's numeric issue
// paths (["lineItems", i, "discountValue"]) map back to the right row.
export function collectQuoteErrors(
  input: QuoteInput,
  lineKeys: string[],
  subtotalCents: number,
): FieldErrors;
```

Behavior:
- Run `quoteSchema.safeParse(input)`; for each issue, translate its `path` to a
  `FieldErrors` slot (first issue per field wins — one message per field).
- Fold in the one rule the schema cannot see (it lacks the subtotal): the
  order-discount-exceeds-subtotal check, reusing
  `orderDiscountExceedsSubtotal` from `pricing.ts`. Its message lands on
  `orderDiscount`.
- Return an empty-ish map (`{ lines: {} }`) when everything is valid.

A small `hasAnyError(errors): boolean` helper keeps the "are there blockers?"
check in one place.

### State: `src/lib/use-quote-editor.ts`

- Add `touched: Set<string>` and `markTouched(fieldId: string)`. Field ids are
  stable strings: `"clientId"`, `"taxRatePercent"`, `"orderDiscount"`, and
  per-line `"<lineKey>:<field>"` (e.g. `"line-3:discountValue"`).
- Derive `errors = useMemo(() => collectQuoteErrors(buildInput(), lineKeys, totals.subtotalCents), …)`.
- Expose a `visibleError(fieldId): string | undefined` — returns the error only
  when `touched.has(fieldId)` (blur-then-live). This governs per-field red.
- `save()` / `finalize()`: if `hasAnyError(errors)`, call `revealAllErrors()`
  (mark every errored field's id touched) and scroll to the first invalid field,
  then return without calling the server. Otherwise proceed as today.
- `revealAllErrors()` also runs on the click path so untouched-but-invalid fields
  (e.g. a never-focused empty description on a fresh quote) light up on Save.
- Replace the old single `validationError` string; the order-discount error now
  flows through `errors.orderDiscount` like every other field.
- Buttons stay enabled: do **not** wire `saveDisabled`/`finalizeDisabled` to the
  error state (those props remain for the existing `saving`/`statusPending`
  cases only).

Scroll-to-first-error: after `revealAllErrors()`, in a `requestAnimationFrame`,
`document.querySelector('[aria-invalid="true"]')` → `scrollIntoView({ block:
"center" })` and `focus()`. Simple, framework-light, and relies on the
`aria-invalid` attribute the inputs already set.

### Inputs: `MoneyInput.tsx`, `NumberInput.tsx`

Add optional passthrough props: `error?: string`, `onBlur?`. When `error` is
set, the input renders `aria-invalid` (shadcn `Input` already draws the red
border/ring from that) and an inline `<p className="text-xs text-destructive">`
below — the exact pattern already in `AdjustmentsCard:79`.

### Wiring: `QuoteEditorForm.tsx`, `LineItemRow.tsx`, `AdjustmentsCard.tsx`

- `QuoteEditorForm` threads `visibleError` + `markTouched` down to each row and
  to `AdjustmentsCard`.
- `LineItemRow` surfaces errors for description, quantity, rate, and the per-line
  discount, calling `markTouched("<lineKey>:<field>")` on blur.
- `AdjustmentsCard` already shows an order-discount error; switch it to read
  `visibleError("orderDiscount")` and add the same treatment for tax rate.

## Error handling / edge cases

- Empty quote (no lines): `quoteSchema` allows an empty `lineItems` array; Save
  is still gated by client-required and any other errors. No lines → no per-line
  errors.
- Deleting a line drops its `touched` ids implicitly (they key off the gone line
  key); stale ids are harmless since `visibleError` only reads by current id.
- Locked (non-draft) quotes: inputs are already disabled; no validation UI
  changes needed there.
- Server remains the source of truth: if the client somehow misses a case, the
  `saveQuote` re-validation still rejects it (no silent failure).

## Testing

- **Unit** (`quote-errors.test.ts`, vitest — the repo's runner): table-driven
  over `collectQuoteErrors` — empty description, quantity 0, negative rate,
  per-line percent > 100, per-line fixed > line total, order percent > 100,
  order fixed > subtotal, and the all-valid case (expect empty map). Assert the
  correct field slot and message for each.
- **Typecheck** — `tsc` clean.
- **Code review** — run `/code-review` (or the code-reviewer agent) per the
  project's Definition of Done and address findings.

## Files touched

- `src/lib/quote-errors.ts` — new (mapping + `hasAnyError`).
- `src/lib/quote-errors.test.ts` — new.
- `src/lib/use-quote-editor.ts` — touched state, derived errors, reveal+scroll,
  drop `validationError`.
- `src/components/MoneyInput.tsx`, `src/components/NumberInput.tsx` — `error` +
  `onBlur` passthrough, `aria-invalid`, inline message.
- `src/components/LineItemRow.tsx` — per-field errors + blur.
- `src/components/AdjustmentsCard.tsx` — order discount via `visibleError`, tax
  error.
- `src/components/QuoteEditorForm.tsx` — thread errors/markTouched.
- `docs/CONTEXT.md` — record the new `quote-errors.ts` unit.
- `docs/DECISIONS.md` — record the validation-timing / enabled-Save decision.
