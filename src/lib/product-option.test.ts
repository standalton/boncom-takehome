/**
 * product-option.test.ts — picking a catalog product builds the right line patch,
 * including swapping an auto-filled description when the catalog item changes.
 */
import { describe, it, expect } from "vitest";
import { patchForProductPick, type ProductOption } from "./product-option";

const A: ProductOption = { id: "a", name: "Website Audit", description: "", rateCents: 5000 };
const B: ProductOption = { id: "b", name: "SEO Retainer", description: "", rateCents: 9000 };
const products = [A, B];

describe("patchForProductPick", () => {
  it("fills description, rate, and productId on an empty line", () => {
    const patch = patchForProductPick(A, { description: "", productId: null }, products);
    expect(patch).toEqual({ description: "Website Audit", rateCents: 5000, productId: "a" });
  });

  it("swaps the description when switching from one catalog item to another", () => {
    // The line was filled from product A; picking B must replace A's name.
    const patch = patchForProductPick(B, { description: "Website Audit", productId: "a" }, products);
    expect(patch).toEqual({ description: "SEO Retainer", rateCents: 9000, productId: "b" });
  });

  it("keeps a description the user typed themselves", () => {
    const patch = patchForProductPick(B, { description: "Custom scope of work", productId: "a" }, products);
    expect(patch.description).toBe("Custom scope of work");
    expect(patch.rateCents).toBe(9000);
    expect(patch.productId).toBe("b");
  });

  it("treats a non-empty description with no prior product as user-typed", () => {
    const patch = patchForProductPick(A, { description: "Typed first", productId: null }, products);
    expect(patch.description).toBe("Typed first");
  });
});
