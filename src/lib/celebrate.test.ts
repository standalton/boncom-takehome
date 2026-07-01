/**
 * celebrate.test.ts — unit tests for the paid-quote confetti helper.
 *
 * What:        Verifies the burst fires when motion is allowed and is skipped
 *              under prefers-reduced-motion.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const confettiSpy = vi.fn();
vi.mock("canvas-confetti", () => ({ default: confettiSpy }));

import { celebratePaid } from "./celebrate";

function stubMatchMedia(reduced: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: reduced,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

describe("celebratePaid", () => {
  beforeEach(() => confettiSpy.mockClear());
  afterEach(() => vi.unstubAllGlobals());

  it("fires a confetti burst when motion is allowed", async () => {
    stubMatchMedia(false);
    await celebratePaid();
    expect(confettiSpy).toHaveBeenCalledOnce();
  });

  it("skips silently under prefers-reduced-motion", async () => {
    stubMatchMedia(true);
    await celebratePaid();
    expect(confettiSpy).not.toHaveBeenCalled();
  });
});
