import { describe, it, expect } from "vitest";
import {
  TARGET_FIELDS,
  autoMap,
  buildClientRecord,
  buildProductRecord,
  buildQuoteLineRecord,
  cell,
} from "./targets";

describe("TARGET_FIELDS", () => {
  it("defines required fields for each target", () => {
    expect(TARGET_FIELDS.clients.find((f) => f.key === "company")?.required).toBe(true);
    expect(TARGET_FIELDS.products.find((f) => f.key === "name")?.required).toBe(true);
    expect(TARGET_FIELDS.quotes.find((f) => f.key === "client")?.required).toBe(true);
    expect(TARGET_FIELDS.quotes.find((f) => f.key === "description")?.required).toBe(true);
  });
});

describe("autoMap", () => {
  it("maps headers to fields by alias, case-insensitively", () => {
    const mapping = autoMap("quotes", ["Client", "Description", "Qty", "Rate"]);
    expect(mapping.client).toBe(0);
    expect(mapping.description).toBe(1);
    expect(mapping.quantity).toBe(2);
    expect(mapping.rate).toBe(3);
  });
  it("leaves unmatched fields null", () => {
    const mapping = autoMap("clients", ["Company"]);
    expect(mapping.company).toBe(0);
    expect(mapping.email).toBeNull();
  });
});

const row = ["Acme Corp", "Jane Doe", "jane@acme.com", "555-1234"];
const map = { company: 0, contactName: 1, email: 2, phone: 3 };

describe("cell", () => {
  it("reads a mapped cell and trims it", () => {
    expect(cell(row, map, "company")).toBe("Acme Corp");
  });
  it("returns '' for an unmapped field", () => {
    expect(cell(row, { company: null }, "company")).toBe("");
  });
});

describe("buildClientRecord", () => {
  it("builds a valid client", () => {
    expect(buildClientRecord(row, map)).toEqual({
      ok: true,
      record: {
        company: "Acme Corp",
        contactName: "Jane Doe",
        email: "jane@acme.com",
        phone: "555-1234",
      },
    });
  });
  it("errors when company is blank", () => {
    const r = buildClientRecord(["", "", "", ""], map);
    expect(r.ok).toBe(false);
  });
  it("errors on a malformed email", () => {
    const r = buildClientRecord(["Acme", "", "not-an-email", ""], map);
    expect(r.ok).toBe(false);
  });
});

describe("buildProductRecord", () => {
  const pmap = { name: 0, description: 1, rate: 2, unit: 3 };
  it("builds a valid product, parsing the rate to cents", () => {
    const r = buildProductRecord(["Logo design", "Brand work", "$1,200", "project"], pmap);
    expect(r).toEqual({
      ok: true,
      record: {
        name: "Logo design",
        description: "Brand work",
        defaultRateCents: 120000,
        unit: "project",
      },
    });
  });
  it("errors on an unknown unit", () => {
    const r = buildProductRecord(["Logo", "", "100", "widget"], pmap);
    expect(r.ok).toBe(false);
  });
  it("errors on a non-numeric rate", () => {
    const r = buildProductRecord(["Logo", "", "free", ""], pmap);
    expect(r.ok).toBe(false);
  });
});

describe("buildQuoteLineRecord", () => {
  const qmap = { client: 0, quote: 1, description: 2, quantity: 3, rate: 4 };
  it("builds a valid line with client + quote group", () => {
    const r = buildQuoteLineRecord(["Acme", "EST-1", "Logo", "2", "1200"], qmap);
    expect(r).toEqual({
      ok: true,
      record: {
        client: "Acme",
        quoteGroup: "EST-1",
        description: "Logo",
        quantity: 2,
        rateCents: 120000,
      },
    });
  });
  it("errors on zero quantity", () => {
    const r = buildQuoteLineRecord(["Acme", "", "Logo", "0", "1200"], qmap);
    expect(r.ok).toBe(false);
  });
  it("errors on a blank client", () => {
    const r = buildQuoteLineRecord(["", "", "Logo", "1", "1200"], qmap);
    expect(r.ok).toBe(false);
  });
});
