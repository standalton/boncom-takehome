import { describe, it, expect } from "vitest";
import {
  isEditableStatus,
  canTransition,
  statusesThatCanBecome,
  STATUS_TRANSITIONS,
  QUOTE_STATUSES,
  isQuoteStatus,
} from "./quote-status";
import type { QuoteStatus } from "./types";

const ALL: QuoteStatus[] = ["draft", "finalized", "sent", "accepted", "paid", "declined"];

describe("isEditableStatus", () => {
  it("allows editing only a draft", () => {
    expect(isEditableStatus("draft")).toBe(true);
    for (const s of ALL.filter((s) => s !== "draft")) {
      expect(isEditableStatus(s)).toBe(false);
    }
  });
});

describe("canTransition", () => {
  it("permits the core lifecycle moves", () => {
    expect(canTransition("draft", "finalized")).toBe(true);
    expect(canTransition("finalized", "sent")).toBe(true);
    expect(canTransition("finalized", "draft")).toBe(true); // revert to edit
    expect(canTransition("sent", "accepted")).toBe(true);
    expect(canTransition("sent", "paid")).toBe(true);
    expect(canTransition("sent", "declined")).toBe(true);
    expect(canTransition("sent", "sent")).toBe(true); // re-send
  });

  it("rejects illegal jumps that skip the pipeline", () => {
    expect(canTransition("draft", "sent")).toBe(false);
    expect(canTransition("draft", "paid")).toBe(false);
    expect(canTransition("draft", "accepted")).toBe(false);
    expect(canTransition("finalized", "paid")).toBe(false);
  });

  it("lets post-send states move among themselves but not back to draft/finalized", () => {
    expect(canTransition("accepted", "paid")).toBe(true);
    expect(canTransition("paid", "declined")).toBe(true);
    expect(canTransition("declined", "sent")).toBe(true);
    expect(canTransition("paid", "draft")).toBe(false);
    expect(canTransition("accepted", "finalized")).toBe(false);
  });
});

describe("statusesThatCanBecome", () => {
  it("is the exact inverse of the forward transition map", () => {
    for (const to of ALL) {
      const froms = statusesThatCanBecome(to);
      for (const from of ALL) {
        expect(froms.includes(from)).toBe(STATUS_TRANSITIONS[from].includes(to));
      }
    }
  });

  it("only a draft can become finalized", () => {
    expect(statusesThatCanBecome("finalized")).toEqual(["draft"]);
  });
});

describe("isQuoteStatus", () => {
  it("lists all six statuses", () => {
    expect([...QUOTE_STATUSES].sort()).toEqual([...ALL].sort());
  });

  it("accepts a real status", () => {
    expect(isQuoteStatus("sent")).toBe(true);
  });

  it("rejects an unknown value", () => {
    expect(isQuoteStatus("deleted")).toBe(false);
  });
});
