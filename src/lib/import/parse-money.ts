/**
 * parse-money.ts — strict currency-string → integer-cents parser for import.
 *
 * What:        Turns a spreadsheet cell like "$1,250.00" into cents, and — unlike
 *              lib/money.ts's dollarsToCents — returns an ERROR for blank or
 *              non-numeric input instead of silently yielding 0.
 * Where used:  src/lib/import/targets.ts when building product/line records.
 * Notes:       Import must surface bad money to the user, never hide it. Keep the
 *              non-negative rule aligned with the DB CHECK (rate_cents >= 0).
 */
export type MoneyResult = { ok: true; cents: number } | { ok: false; error: string };

export function parseMoneyToCents(raw: string): MoneyResult {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, error: "Rate is required" };
  // Strip currency symbols and thousands separators, keep sign, digits, dot.
  const cleaned = trimmed.replace(/[$,\s]/g, "");
  const n = Number(cleaned);
  if (Number.isNaN(n)) return { ok: false, error: "Rate is not a number" };
  if (n < 0) return { ok: false, error: "Rate cannot be negative" };
  return { ok: true, cents: Math.round(n * 100) };
}
