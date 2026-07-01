/**
 * pagination.test.ts — unit tests for pagination helpers.
 */
import { describe, expect, it } from "vitest";
import { pageCount, pageItems, pageRange, parsePage } from "@/lib/pagination";

describe("parsePage", () => {
  it("defaults invalid/missing values to 1", () => {
    expect(parsePage(undefined)).toBe(1);
    expect(parsePage("")).toBe(1);
    expect(parsePage("0")).toBe(1);
    expect(parsePage("-3")).toBe(1);
    expect(parsePage("2.5")).toBe(1);
    expect(parsePage("abc")).toBe(1);
  });
  it("accepts valid pages", () => {
    expect(parsePage("1")).toBe(1);
    expect(parsePage("42")).toBe(42);
  });
});

describe("pageRange", () => {
  it("computes inclusive bounds for a page size of 25", () => {
    expect(pageRange(1)).toEqual({ from: 0, to: 24 });
    expect(pageRange(2)).toEqual({ from: 25, to: 49 });
    expect(pageRange(3, 10)).toEqual({ from: 20, to: 29 });
  });
});

describe("pageCount", () => {
  it("rounds up and never returns less than 1", () => {
    expect(pageCount(0)).toBe(1);
    expect(pageCount(25)).toBe(1);
    expect(pageCount(26)).toBe(2);
    expect(pageCount(340)).toBe(14);
  });
});

describe("pageItems", () => {
  it("lists every page when there are few", () => {
    expect(pageItems(1, 5)).toEqual([1, 2, 3, 4, 5]);
  });
  it("collapses long ranges with ellipses around the current page", () => {
    expect(pageItems(8, 20)).toEqual([1, "ellipsis", 7, 8, 9, "ellipsis", 20]);
  });
  it("does not show a leading ellipsis near the start", () => {
    expect(pageItems(2, 20)).toEqual([1, 2, 3, "ellipsis", 20]);
  });
});
