import { describe, it, expect } from "vitest";
import { collectQuoteErrors, hasAnyError, finalizeBlockedReason } from "./quote-errors";
import type { QuoteInput } from "./validation";
import type { LineItemInput } from "./validation";

const line = (over: Partial<LineItemInput> = {}): LineItemInput => ({
  description: "Design work",
  quantity: 2,
  rateCents: 5000,
  discountType: "none",
  discountValue: 0,
  productId: null,
  ...over,
});

const quote = (over: Partial<QuoteInput> = {}): QuoteInput => ({
  clientId: "client-1",
  taxRatePercent: 10,
  orderDiscountType: "none",
  orderDiscountValue: 0,
  notes: "",
  validUntil: "",
  lineItems: [line()],
  ...over,
});

// A valid one-line quote has a subtotal of 2 * 5000 = 10000 cents.
const VALID_SUBTOTAL = 10000;

describe("collectQuoteErrors", () => {
  it("returns no errors for a valid quote", () => {
    const errors = collectQuoteErrors(quote(), ["k0"], VALID_SUBTOTAL);
    expect(errors).toEqual({ lines: {} });
    expect(hasAnyError(errors)).toBe(false);
  });

  it("flags a missing client", () => {
    const errors = collectQuoteErrors(quote({ clientId: "" }), ["k0"], VALID_SUBTOTAL);
    expect(errors.clientId).toBeTruthy();
    expect(hasAnyError(errors)).toBe(true);
  });

  it("flags a tax rate over 100", () => {
    const errors = collectQuoteErrors(quote({ taxRatePercent: 150 }), ["k0"], VALID_SUBTOTAL);
    expect(errors.taxRatePercent).toBeTruthy();
  });

  it("flags an empty line description keyed by line key", () => {
    const errors = collectQuoteErrors(
      quote({ lineItems: [line({ description: "" })] }),
      ["k0"],
      VALID_SUBTOTAL,
    );
    expect(errors.lines.k0?.description).toBeTruthy();
  });

  it("flags a zero quantity", () => {
    const errors = collectQuoteErrors(
      quote({ lineItems: [line({ quantity: 0 })] }),
      ["k0"],
      0,
    );
    expect(errors.lines.k0?.quantity).toBeTruthy();
  });

  it("flags a negative rate", () => {
    const errors = collectQuoteErrors(
      quote({ lineItems: [line({ rateCents: -100 })] }),
      ["k0"],
      0,
    );
    expect(errors.lines.k0?.rateCents).toBeTruthy();
  });

  it("flags a per-line percent discount over 100", () => {
    const errors = collectQuoteErrors(
      quote({ lineItems: [line({ discountType: "percent", discountValue: 120 })] }),
      ["k0"],
      VALID_SUBTOTAL,
    );
    expect(errors.lines.k0?.discountValue).toBeTruthy();
  });

  it("flags a per-line fixed discount larger than the line total", () => {
    // line total is 2 * 5000 = 10000; a 20000 fixed discount exceeds it.
    const errors = collectQuoteErrors(
      quote({ lineItems: [line({ discountType: "fixed", discountValue: 20000 })] }),
      ["k0"],
      VALID_SUBTOTAL,
    );
    expect(errors.lines.k0?.discountValue).toBeTruthy();
  });

  it("flags an order percent discount over 100", () => {
    const errors = collectQuoteErrors(
      quote({ orderDiscountType: "percent", orderDiscountValue: 120 }),
      ["k0"],
      VALID_SUBTOTAL,
    );
    expect(errors.orderDiscount).toBeTruthy();
  });

  it("flags an order fixed discount larger than the subtotal", () => {
    const errors = collectQuoteErrors(
      quote({ orderDiscountType: "fixed", orderDiscountValue: 999999 }),
      ["k0"],
      VALID_SUBTOTAL,
    );
    expect(errors.orderDiscount).toBe("The order discount can't exceed the subtotal.");
  });

  it("maps errors across multiple lines by their keys", () => {
    const errors = collectQuoteErrors(
      quote({ lineItems: [line(), line({ description: "" })] }),
      ["k0", "k1"],
      VALID_SUBTOTAL,
    );
    expect(errors.lines.k0).toBeUndefined();
    expect(errors.lines.k1?.description).toBeTruthy();
  });
});

describe("finalizeBlockedReason", () => {
  it("blocks finalizing a quote with no line items", () => {
    expect(finalizeBlockedReason(0)).toBe("Add at least one line item before finalizing.");
  });

  it("allows finalizing once there is at least one line item", () => {
    expect(finalizeBlockedReason(1)).toBeNull();
    expect(finalizeBlockedReason(5)).toBeNull();
  });
});
