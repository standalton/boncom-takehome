import { describe, it, expect } from "vitest";
import { parseCsv, toTable } from "./parse";

describe("parseCsv", () => {
  it("parses rows and cells, trimming a trailing newline", () => {
    const csv = "Client,Qty\nAcme,2\nGlobex,1\n";
    expect(parseCsv(csv)).toEqual([
      ["Client", "Qty"],
      ["Acme", "2"],
      ["Globex", "1"],
    ]);
  });
  it("handles quoted cells containing commas", () => {
    const csv = 'Description,Rate\n"Logo, final",1200\n';
    expect(parseCsv(csv)).toEqual([
      ["Description", "Rate"],
      ["Logo, final", "1200"],
    ]);
  });
  it("skips fully blank rows", () => {
    const csv = "A,B\n\n1,2\n";
    expect(parseCsv(csv)).toEqual([
      ["A", "B"],
      ["1", "2"],
    ]);
  });
});

describe("toTable", () => {
  it("splits the header row from the data rows", () => {
    const table = toTable([
      ["Client", "Qty"],
      ["Acme", "2"],
    ]);
    expect(table.headers).toEqual(["Client", "Qty"]);
    expect(table.rows).toEqual([["Acme", "2"]]);
  });
  it("throws on an empty sheet (no silent empty import)", () => {
    expect(() => toTable([])).toThrow(/empty/i);
  });
  it("throws when there is a header but no data rows", () => {
    expect(() => toTable([["Client", "Qty"]])).toThrow(/no data rows/i);
  });
});
