/**
 * product-units.ts — the canonical set of billing units for catalog products.
 *
 * What:        The closed list of units a product can be priced in (flat,
 *              hourly, project, ...) with display labels, plus helpers to
 *              validate and format a stored unit value.
 * Where used:  AddProductDialog (dropdown options), products server action
 *              (server-side validation), products page (display label).
 * Notes:       Values must stay stable — they are persisted in `products.unit`
 *              and already exist in seed data (e.g. "project", "month").
 */

export const PRODUCT_UNITS = [
  { value: "flat", label: "Flat fee" },
  { value: "hour", label: "Hourly" },
  { value: "day", label: "Daily" },
  { value: "week", label: "Weekly" },
  { value: "month", label: "Monthly" },
  { value: "project", label: "Project" },
  { value: "unit", label: "Per unit" },
] as const;

export type ProductUnit = (typeof PRODUCT_UNITS)[number]["value"];

const UNIT_VALUES = PRODUCT_UNITS.map((u) => u.value) as readonly string[];
const UNIT_LABELS: Record<string, string> = Object.fromEntries(
  PRODUCT_UNITS.map((u) => [u.value, u.label]),
);

export function isProductUnit(value: string): value is ProductUnit {
  return UNIT_VALUES.includes(value);
}

/**
 * Display label for a stored unit value. Unknown/legacy values are shown
 * verbatim rather than dropped, so we never silently hide real data.
 */
export function formatUnit(value: string | null | undefined): string {
  if (!value) return "—";
  return UNIT_LABELS[value] ?? value;
}
