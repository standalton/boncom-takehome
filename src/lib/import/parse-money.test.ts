import { describe, it, expect } from "vitest";
import { parseMoneyToCents } from "./parse-money";

describe("parseMoneyToCents", () => {
  it("parses a plain number", () => {
    expect(parseMoneyToCents("1250")).toEqual({ ok: true, cents: 125000 });
  });
  it("parses a currency string with symbol and thousands separators", () => {
    expect(parseMoneyToCents("$1,250.00")).toEqual({ ok: true, cents: 125000 });
  });
  it("rounds to the nearest cent", () => {
    expect(parseMoneyToCents("19.999")).toEqual({ ok: true, cents: 2000 });
  });
  it("treats blank as an error, not zero (import must not hide missing money)", () => {
    expect(parseMoneyToCents("  ")).toEqual({ ok: false, error: "Rate is required" });
  });
  it("rejects non-numeric text", () => {
    expect(parseMoneyToCents("free")).toEqual({ ok: false, error: "Rate is not a number" });
  });
  it("rejects negative money", () => {
    expect(parseMoneyToCents("-5")).toEqual({ ok: false, error: "Rate cannot be negative" });
  });
});
