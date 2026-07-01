// @vitest-environment node
import { describe, it, expect } from "vitest";
import { renderToBuffer } from "@react-pdf/renderer";
import { QuotePdf, type QuoteExportData } from "./QuotePdf";

const sample: QuoteExportData = {
  number: "QUO-0009",
  statusLabel: "Finalized",
  issuedOn: "Jun 30, 2026",
  validUntil: "Jul 30, 2026",
  client: {
    company: "Northwind Foods",
    contactName: "Dana Whitfield",
    email: "dana@northwindfoods.com",
    phone: "(415) 555-0142",
  },
  lines: [
    { description: "Website build", quantity: 1, rateCents: 1200000, lineNetCents: 1080000 },
    { description: "SEO retainer", quantity: 3, rateCents: 180000, lineNetCents: 540000 },
  ],
  subtotalCents: 1620000,
  discountCents: 81000,
  taxCents: 123120,
  totalCents: 1662120,
  taxRatePercent: 8,
};

describe("QuotePdf", () => {
  it("renders a real PDF document", async () => {
    const buffer = await renderToBuffer(<QuotePdf data={sample} />);
    // A valid PDF file begins with the "%PDF-" magic header.
    expect(buffer.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    expect(buffer.length).toBeGreaterThan(1000);
  });

  it("renders without a client (empty bill-to)", async () => {
    const buffer = await renderToBuffer(<QuotePdf data={{ ...sample, client: undefined }} />);
    expect(buffer.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  });
});
