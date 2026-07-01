/**
 * product-units.test.ts — unit tests for the product unit catalog helpers.
 *
 * What:        Verifies the unit list is well-formed and that validation +
 *              formatting handle known, unknown, and empty values.
 * Where used:  Vitest (npm test).
 */
import { describe, expect, it } from "vitest";
import {
  PRODUCT_UNITS,
  formatUnit,
  isProductUnit,
} from "@/lib/product-units";

describe("product-units", () => {
  it("has unique, non-empty values and labels", () => {
    const values = PRODUCT_UNITS.map((u) => u.value);
    expect(new Set(values).size).toBe(values.length);
    for (const u of PRODUCT_UNITS) {
      expect(u.value).not.toBe("");
      expect(u.label).not.toBe("");
    }
  });

  it("keeps the values that already exist in seed data", () => {
    // These are persisted in the DB; removing them would strand real rows.
    expect(isProductUnit("project")).toBe(true);
    expect(isProductUnit("month")).toBe(true);
  });

  it("accepts known units and rejects unknown ones", () => {
    expect(isProductUnit("hour")).toBe(true);
    expect(isProductUnit("fortnight")).toBe(false);
    expect(isProductUnit("")).toBe(false);
  });

  it("formats known units to their label", () => {
    expect(formatUnit("hour")).toBe("Hourly");
    expect(formatUnit("project")).toBe("Project");
  });

  it("shows a dash for empty and passes legacy values through verbatim", () => {
    expect(formatUnit(null)).toBe("—");
    expect(formatUnit(undefined)).toBe("—");
    expect(formatUnit("")).toBe("—");
    expect(formatUnit("legacy-unit")).toBe("legacy-unit");
  });
});
