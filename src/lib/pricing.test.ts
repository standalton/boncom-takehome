import { describe, it, expect } from "vitest";
import { computeTotals, orderDiscountExceedsSubtotal, type PricingInput } from "./pricing";

const line = (
  quantity: number,
  rateCents: number,
  discountType: "none" | "percent" | "fixed" = "none",
  discountValue = 0,
) => ({ quantity, rateCents, discountType, discountValue });

describe("orderDiscountExceedsSubtotal", () => {
  it("flags a fixed discount larger than the subtotal", () => {
    expect(orderDiscountExceedsSubtotal("fixed", 5001, 5000)).toBe(true);
  });
  it("allows a fixed discount equal to the subtotal", () => {
    expect(orderDiscountExceedsSubtotal("fixed", 5000, 5000)).toBe(false);
  });
  it("never flags percent or none discounts (they can't exceed the base)", () => {
    expect(orderDiscountExceedsSubtotal("percent", 100, 5000)).toBe(false);
    expect(orderDiscountExceedsSubtotal("none", 999999, 5000)).toBe(false);
  });
});

describe("computeTotals", () => {
  it("computes a simple subtotal with no discounts or tax", () => {
    const input: PricingInput = {
      lineItems: [line(2, 150000), line(1, 200000)],
      orderDiscountType: "none",
      orderDiscountValue: 0,
      taxRatePercent: 0,
    };
    const r = computeTotals(input);
    expect(r.subtotalCents).toBe(500000);
    expect(r.totalCents).toBe(500000);
  });

  it("applies per-line %, order %, and tax after discount (the locked case)", () => {
    const input: PricingInput = {
      lineItems: [line(1, 400000, "percent", 15), line(1, 150000)],
      orderDiscountType: "percent",
      orderDiscountValue: 10,
      taxRatePercent: 7,
    };
    const r = computeTotals(input);
    expect(r.subtotalCents).toBe(490000); // 340000 + 150000
    expect(r.discountCents).toBe(49000); // 10% of 490000
    expect(r.taxCents).toBe(30870); // 7% of 441000
    expect(r.totalCents).toBe(471870); // $4,718.70
  });

  it("clamps a fixed discount that exceeds the base to never go negative", () => {
    const r = computeTotals({
      lineItems: [line(1, 10000, "fixed", 99999)],
      orderDiscountType: "none",
      orderDiscountValue: 0,
      taxRatePercent: 0,
    });
    expect(r.subtotalCents).toBe(0);
    expect(r.totalCents).toBe(0);
  });

  it("returns zero for an empty estimate", () => {
    const r = computeTotals({
      lineItems: [],
      orderDiscountType: "none",
      orderDiscountValue: 0,
      taxRatePercent: 0,
    });
    expect(r.subtotalCents).toBe(0);
    expect(r.totalCents).toBe(0);
  });

  it("handles fractional quantity and rounds to cents", () => {
    const r = computeTotals({
      lineItems: [line(1.5, 10001)],
      orderDiscountType: "none",
      orderDiscountValue: 0,
      taxRatePercent: 0,
    });
    expect(r.subtotalCents).toBe(15002); // round(1.5 * 10001) = round(15001.5) = 15002
  });

  it("caps a percentage discount at 100%", () => {
    const r = computeTotals({
      lineItems: [line(1, 10000, "percent", 150)],
      orderDiscountType: "none",
      orderDiscountValue: 0,
      taxRatePercent: 0,
    });
    expect(r.subtotalCents).toBe(0);
  });
});
