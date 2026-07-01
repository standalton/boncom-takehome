import { describe, it, expect } from "vitest";
import { toCsv, templateCsv, IMPORT_TEMPLATES } from "./template";
import { autoMap, TARGET_FIELDS } from "./targets";
import { parseCsv, toTable } from "./parse";

describe("toCsv", () => {
  it("joins headers and rows with newlines and a trailing newline", () => {
    expect(toCsv(["A", "B"], [["1", "2"]])).toBe("A,B\n1,2\n");
  });
  it("quotes cells containing a comma, quote, or newline", () => {
    expect(toCsv(["A"], [['Logo, final']])).toBe('A\n"Logo, final"\n');
    expect(toCsv(["A"], [['He said "hi"']])).toBe('A\n"He said ""hi"""\n');
  });
});

describe("templateCsv", () => {
  it("produces a non-empty sheet for every target", () => {
    for (const target of ["clients", "products", "quotes"] as const) {
      expect(templateCsv(target).length).toBeGreaterThan(0);
    }
  });

  // The whole point of the template: its headers already auto-map to the
  // target's required fields, so a downloaded template imports cleanly.
  it("round-trips: every required field auto-maps from the template headers", () => {
    for (const target of ["clients", "products", "quotes"] as const) {
      const table = toTable(parseCsv(templateCsv(target)));
      const mapping = autoMap(target, table.headers);
      const required = TARGET_FIELDS[target].filter((f) => f.required);
      for (const field of required) {
        expect(mapping[field.key], `${target}.${field.key}`).not.toBeNull();
      }
    }
  });

  it("has a header per column in every sample row", () => {
    for (const target of ["clients", "products", "quotes"] as const) {
      const { headers, rows } = IMPORT_TEMPLATES[target];
      for (const row of rows) expect(row).toHaveLength(headers.length);
    }
  });
});
