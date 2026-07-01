import { describe, it, expect } from "vitest";
import { computeStats, type DashboardQuote } from "./dashboard";

const q = (over: Partial<DashboardQuote>): DashboardQuote => ({
  id: "1",
  number: "QUO-0001",
  status: "draft",
  total_cents: 100000,
  clients: null,
  ...over,
});

describe("computeStats", () => {
  it("splits value by lifecycle stage", () => {
    const quotes = [
      q({ status: "draft", total_cents: 100 }),
      q({ status: "finalized", total_cents: 200 }),
      q({ status: "sent", total_cents: 300 }),
      q({ status: "accepted", total_cents: 400 }),
      q({ status: "paid", total_cents: 500 }),
      q({ status: "declined", total_cents: 600 }),
    ];
    const s = computeStats(quotes);
    expect(s.openPipelineCents).toBe(500); // finalized + sent
    expect(s.openCount).toBe(2);
    expect(s.wonCents).toBe(900); // accepted + paid
    expect(s.sentCents).toBe(300);
    expect(s.sentCount).toBe(1);
    expect(s.draftCount).toBe(1);
  });

  it("computes win rate over decided quotes only", () => {
    // 2 won, 1 declined, 1 sent (undecided) -> 2/3 = 67%
    const quotes = [
      q({ status: "accepted" }),
      q({ status: "paid" }),
      q({ status: "declined" }),
      q({ status: "sent" }),
    ];
    expect(computeStats(quotes).winRatePercent).toBe(67);
  });

  it("returns null win rate when nothing is decided", () => {
    expect(computeStats([q({ status: "draft" }), q({ status: "sent" })]).winRatePercent).toBeNull();
  });
});
