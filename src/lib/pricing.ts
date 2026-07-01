/**
 * pricing.ts — the single source of truth for all estimate math.
 *
 * What:        Pure, dependency-free money calculations. Given line items,
 *              an order-level discount, and a tax rate, returns the subtotal,
 *              discount, tax, and grand total — all in integer cents.
 * Where used:  The quote editor (live totals in the browser) and the
 *              saveQuote server action (authoritative totals persisted to the
 *              database). Running the SAME code in both places guarantees the
 *              displayed total and the stored total can never diverge.
 * Notes:       Tax is applied AFTER discounts. Percentages are capped at 100%.
 *              Every layer clamps at zero so a total can never go negative.
 */

export type DiscountType = "none" | "percent" | "fixed";

export interface PricingLineItem {
  quantity: number; // may be fractional (e.g. 1.5 hours)
  rateCents: number; // integer cents
  discountType: DiscountType;
  discountValue: number; // percent (0-100) when "percent"; cents when "fixed"
}

export interface PricingInput {
  lineItems: PricingLineItem[];
  orderDiscountType: DiscountType;
  orderDiscountValue: number;
  taxRatePercent: number;
}

export interface PricingResult {
  lineNetsCents: number[];
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
}

const clampNonNegative = (n: number) => (n < 0 ? 0 : n);

function applyDiscount(baseCents: number, type: DiscountType, value: number): number {
  if (type === "percent") {
    const pct = Math.min(Math.max(value, 0), 100);
    return Math.round(baseCents * (pct / 100));
  }
  if (type === "fixed") {
    return Math.min(clampNonNegative(Math.round(value)), baseCents);
  }
  return 0;
}

/**
 * True when a fixed order discount is larger than the subtotal it applies to.
 * computeTotals would silently clamp such a discount; callers use this to reject
 * it instead so the figure the user entered isn't quietly changed. Shared by the
 * editor (live) and saveQuote (authoritative) so the rule can't diverge.
 */
export function orderDiscountExceedsSubtotal(
  discountType: DiscountType,
  discountValue: number,
  subtotalCents: number,
): boolean {
  return discountType === "fixed" && Math.round(discountValue) > subtotalCents;
}

export function computeTotals(input: PricingInput): PricingResult {
  const lineNetsCents = input.lineItems.map((li) => {
    const gross = clampNonNegative(Math.round(li.quantity * li.rateCents));
    const discount = applyDiscount(gross, li.discountType, li.discountValue);
    return clampNonNegative(gross - discount);
  });

  const subtotalCents = lineNetsCents.reduce((a, b) => a + b, 0);
  const discountCents = applyDiscount(subtotalCents, input.orderDiscountType, input.orderDiscountValue);
  const taxableCents = clampNonNegative(subtotalCents - discountCents);
  const taxCents = Math.round(taxableCents * (Math.max(input.taxRatePercent, 0) / 100));
  const totalCents = clampNonNegative(taxableCents + taxCents);

  return { lineNetsCents, subtotalCents, discountCents, taxCents, totalCents };
}
