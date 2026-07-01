import { describe, it, expect } from "vitest";
import { summarizeChanges, type QuoteSnapshot } from "./quote-changes";

const line = (over: Partial<QuoteSnapshot["lineItems"][number]> = {}) => ({
  description: "Website build",
  quantity: 1,
  rateCents: 100000,
  discountType: "none" as const,
  discountValue: 0,
  productId: null,
  ...over,
});

const base: QuoteSnapshot = {
  clientId: "c1",
  taxRatePercent: 0,
  orderDiscountType: "none",
  orderDiscountValue: 0,
  notes: "",
  validUntil: "",
  lineItems: [line()],
};

describe("summarizeChanges", () => {
  it("returns nothing when nothing changed", () => {
    expect(summarizeChanges(base, base)).toEqual([]);
  });

  it("names each field-level change", () => {
    const after: QuoteSnapshot = {
      ...base,
      clientId: "c2",
      taxRatePercent: 8,
      notes: "Call first",
      validUntil: "2026-07-30",
    };
    expect(summarizeChanges(base, after)).toEqual([
      "Changed the client",
      "Set tax rate to 8%",
      "Updated the notes",
      "Changed the valid-until date",
    ]);
  });

  it("distinguishes adding, changing, and removing the order discount", () => {
    const added = { ...base, orderDiscountType: "percent" as const, orderDiscountValue: 10 };
    expect(summarizeChanges(base, added)).toEqual(["Added an order discount"]);
    expect(summarizeChanges(added, base)).toEqual(["Removed the order discount"]);

    const changed = { ...added, orderDiscountValue: 15 };
    expect(summarizeChanges(added, changed)).toEqual(["Updated the order discount"]);
  });

  it("reports clearing notes distinctly from updating them", () => {
    const withNotes = { ...base, notes: "hello" };
    expect(summarizeChanges(withNotes, base)).toEqual(["Cleared the notes"]);
  });

  it("names added and removed line items", () => {
    const two = { ...base, lineItems: [line(), line({ description: "SEO" })] };
    expect(summarizeChanges(base, two)).toEqual(["Added “SEO”"]);
    const three = { ...base, lineItems: [line(), line(), line()] };
    expect(summarizeChanges(three, base)).toEqual([
      "Removed “Website build”",
      "Removed “Website build”",
    ]);
  });

  it("does not misreport a middle remove + add as a rename (same count)", () => {
    const b = {
      ...base,
      lineItems: [line({ description: "A" }), line({ description: "B" }), line({ description: "C" })],
    };
    // Remove B, add D — count stays 3, positions shift.
    const a = {
      ...base,
      lineItems: [line({ description: "A" }), line({ description: "C" }), line({ description: "D" })],
    };
    expect(summarizeChanges(b, a)).toEqual(["Removed “B”", "Added “D”"]);
  });

  it("names a rate change with from/to amounts", () => {
    const edited = { ...base, lineItems: [line({ rateCents: 250000 })] };
    expect(summarizeChanges(base, edited)).toEqual([
      "Changed rate of “Website build” from $1,000.00 to $2,500.00",
    ]);
  });

  it("names a quantity change", () => {
    const edited = { ...base, lineItems: [line({ quantity: 3 })] };
    expect(summarizeChanges(base, edited)).toEqual([
      "Changed quantity of “Website build” from 1 to 3",
    ]);
  });

  it("reports a catalog pick as one action, not a rate change", () => {
    const picked = {
      ...base,
      lineItems: [line({ rateCents: 12300, productId: "p1" })],
    };
    const names = (id: string) => (id === "p1" ? "Discovery workshop" : undefined);
    expect(summarizeChanges(base, picked, names)).toEqual([
      "Applied catalog item “Discovery workshop” to “Website build”",
    ]);
  });

  it("falls back to a generic catalog label when the name is unknown", () => {
    const picked = { ...base, lineItems: [line({ rateCents: 12300, productId: "p9" })] };
    expect(summarizeChanges(base, picked)).toEqual([
      "Applied catalog item “a catalog item” to “Website build”",
    ]);
  });

  it("treats a rename as remove + add (no stable line id)", () => {
    const edited = { ...base, lineItems: [line({ description: "Homepage" })] };
    expect(summarizeChanges(base, edited)).toEqual([
      "Removed “Website build”",
      "Added “Homepage”",
    ]);
  });

  it("names a discount change on a surviving line", () => {
    const edited = {
      ...base,
      lineItems: [line({ discountType: "percent" as const, discountValue: 10 })],
    };
    expect(summarizeChanges(base, edited)).toEqual(["Updated the discount on “Website build”"]);
  });
});
