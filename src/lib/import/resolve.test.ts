import { describe, it, expect } from "vitest";
import { normalizeKey, matchExisting, suggestPromotions, buildPreview } from "./resolve";
import { autoMap } from "./targets";

describe("normalizeKey", () => {
  it("lowercases and collapses whitespace for matching", () => {
    expect(normalizeKey("  Acme   Corp ")).toBe("acme corp");
  });
});

describe("matchExisting", () => {
  const existing = [
    { id: "c1", key: "acme corp" },
    { id: "c2", key: "globex" },
  ];
  it("returns the id of an exact (normalized) match", () => {
    expect(matchExisting("ACME  Corp", existing)).toBe("c1");
  });
  it("returns null when there is no exact match (no fuzzy guessing)", () => {
    expect(matchExisting("Acme", existing)).toBeNull();
  });
});

describe("suggestPromotions", () => {
  const lines = [
    { description: "Logo design", client: "Acme" },
    { description: "Logo design", client: "Globex" },
    { description: "Logo design", client: "Initech" },
    { description: "One-off banner", client: "Acme" },
  ];
  it("suggests a description on >=3 rows across >=2 clients", () => {
    const s = suggestPromotions(lines, 3);
    expect(s).toEqual([{ description: "Logo design", occurrences: 3, clientCount: 3 }]);
  });
  it("does not suggest a description confined to one client", () => {
    const single = [
      { description: "Retainer", client: "Acme" },
      { description: "Retainer", client: "Acme" },
      { description: "Retainer", client: "Acme" },
    ];
    expect(suggestPromotions(single, 3)).toEqual([]);
  });
  it("does not suggest below the occurrence threshold", () => {
    expect(suggestPromotions(lines.slice(0, 2), 3)).toEqual([]);
  });
});

describe("buildPreview (clients)", () => {
  const headers = ["Company", "Email"];
  const mapping = autoMap("clients", headers);
  it("marks an exact existing match as link and a new one as create", () => {
    const preview = buildPreview({
      target: "clients",
      rows: [
        ["Acme Corp", "a@acme.com"],
        ["Newco", "n@newco.com"],
      ],
      mapping,
      existingClients: [{ id: "c1", key: "acme corp" }],
      existingProducts: [],
      promotionThreshold: 3,
    });
    expect(preview.rows[0].status).toBe("link");
    expect(preview.rows[1].status).toBe("create");
    expect(preview.summary.newClients).toBe(1);
    expect(preview.summary.errors).toBe(0);
  });
  it("marks an invalid row as error and counts it out of importable", () => {
    const preview = buildPreview({
      target: "clients",
      rows: [["", "bad"]],
      mapping,
      existingClients: [],
      existingProducts: [],
      promotionThreshold: 3,
    });
    expect(preview.rows[0].status).toBe("error");
    expect(preview.summary.importable).toBe(0);
    expect(preview.summary.errors).toBe(1);
  });
});

describe("buildPreview (quotes)", () => {
  const headers = ["Client", "Description", "Qty", "Rate"];
  const mapping = autoMap("quotes", headers);
  it("groups rows into one quote per client when no quote column is mapped", () => {
    const preview = buildPreview({
      target: "quotes",
      rows: [
        ["Acme", "Logo", "1", "1000"],
        ["Acme", "Banner", "2", "500"],
        ["Globex", "Logo", "1", "1000"],
      ],
      mapping,
      existingClients: [],
      existingProducts: [],
      promotionThreshold: 3,
    });
    expect(preview.summary.quotes).toBe(2);
    expect(preview.summary.newClients).toBe(2);
  });
});
