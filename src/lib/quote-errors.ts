/**
 * quote-errors.ts — maps the quote Zod schemas to per-field UI errors.
 *
 * What:        Runs the same quoteSchema the server uses and translates each
 *              Zod issue into a field-keyed error map the editor can render
 *              inline (red field + message). Folds in the one rule the schema
 *              can't see: an order discount larger than the subtotal.
 * Where used:  use-quote-editor (live, per keystroke) to drive inline validation.
 * Notes:       Presentation/mapping only — the rules themselves live in
 *              lib/validation (schemas) and lib/pricing (subtotal check), so the
 *              UI and the server can never disagree. One message per field
 *              (first issue wins). Line errors are keyed by the editor line key,
 *              not the array index, so they survive reordering/removal.
 */
import { quoteSchema, type QuoteInput } from "@/lib/validation";
import { orderDiscountExceedsSubtotal } from "@/lib/pricing";

export type LineFieldErrors = {
  description?: string;
  quantity?: string;
  rateCents?: string;
  discountValue?: string;
};

export type FieldErrors = {
  clientId?: string;
  taxRatePercent?: string;
  orderDiscount?: string;
  lines: Record<string, LineFieldErrors>;
};

const LINE_FIELDS = ["description", "quantity", "rateCents", "discountValue"] as const;
type LineField = (typeof LINE_FIELDS)[number];

function isLineField(value: unknown): value is LineField {
  return typeof value === "string" && (LINE_FIELDS as readonly string[]).includes(value);
}

/**
 * Translate a validated quote into a field-keyed error map.
 * `lineKeys[i]` must be the editor key for `input.lineItems[i]` so numeric Zod
 * paths (["lineItems", i, field]) resolve back to the right row.
 */
export function collectQuoteErrors(
  input: QuoteInput,
  lineKeys: string[],
  subtotalCents: number,
): FieldErrors {
  const errors: FieldErrors = { lines: {} };
  const result = quoteSchema.safeParse(input);

  if (!result.success) {
    for (const issue of result.error.issues) {
      const [head, index, field] = issue.path;

      if (head === "clientId") {
        errors.clientId ??= issue.message;
      } else if (head === "taxRatePercent") {
        errors.taxRatePercent ??= issue.message;
      } else if (head === "orderDiscountValue") {
        errors.orderDiscount ??= issue.message;
      } else if (head === "lineItems" && typeof index === "number" && isLineField(field)) {
        const key = lineKeys[index];
        if (key) {
          const line = (errors.lines[key] ??= {});
          line[field] ??= issue.message;
        }
      }
    }
  }

  // The schema can't see the subtotal, so the order-discount-vs-subtotal rule is
  // checked here (mirrors saveQuote). Don't clobber a percent-cap message.
  if (
    !errors.orderDiscount &&
    orderDiscountExceedsSubtotal(input.orderDiscountType, input.orderDiscountValue, subtotalCents)
  ) {
    errors.orderDiscount = "The order discount can't exceed the subtotal.";
  }

  return errors;
}

/** True when any field in the map carries an error. */
export function hasAnyError(errors: FieldErrors): boolean {
  if (errors.clientId || errors.taxRatePercent || errors.orderDiscount) return true;
  return Object.values(errors.lines).some((line) => Object.keys(line).length > 0);
}

/**
 * Why a quote can't be finalized yet, or null if it can. A quote needs at least
 * one line item — an empty quote has nothing to commit to the client. Shared by
 * the editor (immediate feedback) and setStatus (authoritative) so the message
 * and the rule can't diverge. This is a finalize-only gate, distinct from the
 * per-field errors above (an empty draft is still saveable as work-in-progress).
 */
export function finalizeBlockedReason(lineItemCount: number): string | null {
  return lineItemCount > 0 ? null : "Add at least one line item before finalizing.";
}
