import { describe, it, expect } from "vitest";
import { formatCents, dollarsToCents } from "./money";

describe("money", () => {
  it("formats cents as USD", () => {
    expect(formatCents(471870)).toBe("$4,718.70");
    expect(formatCents(0)).toBe("$0.00");
    expect(formatCents(150000)).toBe("$1,500.00");
  });

  it("converts a dollar string to integer cents", () => {
    expect(dollarsToCents("4000")).toBe(400000);
    expect(dollarsToCents("19.99")).toBe(1999);
    expect(dollarsToCents("")).toBe(0);
    expect(dollarsToCents("abc")).toBe(0);
  });
});
