import { describe, it, expect } from "vitest";
import { lineItemSchema, quoteSchema } from "./validation";

const validLine = {
  description: "Workshop",
  quantity: 1,
  rateCents: 400000,
  discountType: "percent" as const,
  discountValue: 15,
};

describe("validation", () => {
  it("accepts a valid line item", () => {
    expect(lineItemSchema.safeParse(validLine).success).toBe(true);
  });

  it("rejects a percentage discount over 100", () => {
    expect(lineItemSchema.safeParse({ ...validLine, discountValue: 110 }).success).toBe(false);
  });

  it("rejects a negative rate", () => {
    expect(lineItemSchema.safeParse({ ...validLine, rateCents: -1 }).success).toBe(false);
  });

  it("rejects quantity of zero", () => {
    expect(lineItemSchema.safeParse({ ...validLine, quantity: 0 }).success).toBe(false);
  });

  it("rejects an empty description", () => {
    expect(lineItemSchema.safeParse({ ...validLine, description: "" }).success).toBe(false);
  });

  it("rejects a fixed line discount that exceeds the line total", () => {
    expect(
      lineItemSchema.safeParse({
        ...validLine,
        discountType: "fixed",
        discountValue: 999999, // line total is 1 x 400000 = 400000 cents
      }).success,
    ).toBe(false);
  });

  it("accepts a fixed line discount equal to the line total", () => {
    expect(
      lineItemSchema.safeParse({
        ...validLine,
        discountType: "fixed",
        discountValue: 400000,
      }).success,
    ).toBe(true);
  });

  it("rejects a quote with no client", () => {
    const r = quoteSchema.safeParse({
      clientId: "",
      taxRatePercent: 7,
      orderDiscountType: "none",
      orderDiscountValue: 0,
      lineItems: [validLine],
      notes: "",
    });
    expect(r.success).toBe(false);
  });

  it("rejects a tax rate over 100", () => {
    const r = quoteSchema.safeParse({
      clientId: "c1",
      taxRatePercent: 101,
      orderDiscountType: "none",
      orderDiscountValue: 0,
      lineItems: [validLine],
      notes: "",
    });
    expect(r.success).toBe(false);
  });

  it("rejects an order percentage discount over 100", () => {
    const r = quoteSchema.safeParse({
      clientId: "c1",
      taxRatePercent: 7,
      orderDiscountType: "percent",
      orderDiscountValue: 150,
      lineItems: [validLine],
      notes: "",
    });
    expect(r.success).toBe(false);
  });
});
