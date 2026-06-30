/**
 * money.ts — currency formatting and parsing helpers.
 *
 * What:        Convert between integer cents (how money is stored and computed)
 *              and human-facing dollar strings.
 * Where used:  MoneyInput and any component that displays a total.
 * Notes:       All amounts in the app are integer cents; these are the only
 *              places that touch dollar-denominated strings.
 */

const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function formatCents(cents: number): string {
  return USD.format(cents / 100);
}

export function dollarsToCents(input: string): number {
  if (!input.trim()) return 0;
  const n = Number(input);
  if (Number.isNaN(n)) return 0;
  return Math.round(n * 100);
}
