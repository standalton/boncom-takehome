/**
 * celebrate.ts — one-off confetti burst for a genuine win.
 *
 * What:        Fires a single restrained, brand-colored confetti burst when a
 *              quote is marked paid.
 * Where used:  use-quote-editor, on a confirmed transition to "paid".
 * Notes:       Client-only. canvas-confetti is dynamically imported so it stays
 *              out of the initial bundle. Skips silently under
 *              prefers-reduced-motion, per the app's motion policy (globals.css).
 */

// Boncom brand accents: navy, secondary blue, cyan (see docs/STYLE_GUIDE.md).
const BRAND_COLORS = ["#002042", "#3860be", "#65c6d9"];

/** Whether the user has asked the OS to minimize motion. */
function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * A single low-density confetti burst from just below center. Returns early on
 * the server and when reduced motion is requested — callers can fire-and-forget.
 */
export async function celebratePaid(): Promise<void> {
  if (typeof window === "undefined") return;
  if (prefersReducedMotion()) return;

  const confetti = (await import("canvas-confetti")).default;
  confetti({
    particleCount: 80,
    spread: 70,
    startVelocity: 40,
    gravity: 1.1,
    ticks: 200,
    origin: { x: 0.5, y: 0.6 },
    colors: BRAND_COLORS,
    // Belt-and-suspenders: the library also honors reduced motion itself.
    disableForReducedMotion: true,
  });
}
