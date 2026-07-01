/**
 * sample-data.test.ts — verifies the shipped sample CSVs behave as documented.
 *
 * Runs the real pipeline (parse -> auto-map -> buildPreview) against the files in
 * /sample-imports so the demo data can't silently rot. No DB needed — resolution
 * runs against an empty existing-record set.
 */
import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { parseCsv, toTable } from "./parse";
import { autoMap } from "./targets";
import { buildPreview } from "./resolve";
import type { ImportTarget } from "./types";

function preview(target: ImportTarget, file: string) {
  const text = readFileSync(`sample-imports/${file}`, "utf8");
  const table = toTable(parseCsv(text));
  return buildPreview({
    target,
    rows: table.rows,
    mapping: autoMap(target, table.headers),
    existingClients: [],
    existingProducts: [],
    promotionThreshold: 3,
  });
}

describe("sample import files", () => {
  it("clients-sample.csv imports 4 clients with no errors", () => {
    const p = preview("clients", "clients-sample.csv");
    expect(p.summary.errors).toBe(0);
    expect(p.summary.newClients).toBe(4);
  });

  it("products-sample.csv imports cleanly, parsing the $200 rate", () => {
    const p = preview("products", "products-sample.csv");
    expect(p.summary.errors).toBe(0);
    expect(p.summary.newProducts).toBe(5);
  });

  it("quotes-sample.csv makes 4 quotes across 3 clients, suggests a product, skips the bad row", () => {
    const p = preview("quotes", "quotes-sample.csv");
    expect(p.summary.quotes).toBe(4);
    expect(p.summary.newClients).toBe(3); // Globex's only row is the skipped error
    expect(p.summary.errors).toBe(1);
    expect(p.promotions.map((x) => x.description)).toContain("Logo design");
  });
});
