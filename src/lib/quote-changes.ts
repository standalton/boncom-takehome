/**
 * quote-changes.ts — summarise what changed between two versions of a quote.
 *
 * What:        A pure diff that turns a previous quote state + the incoming edit
 *              into a list of concrete, human-readable change strings
 *              (e.g. "Set tax rate to 8%", "Added 1 line item").
 * Where used:  actions/quotes.saveQuote records the result in the activity log so
 *              the history shows what each save actually changed, not just "saved".
 * Notes:       Line items have no stable id across saves, so they're matched by
 *              description (their only identity). A surviving line's field edits
 *              are named exactly — "Changed rate of 'X' from $A to $B". A
 *              description on only one side is an add/remove. A rename is
 *              therefore indistinguishable from remove+add and reads as one of
 *              each — honest, never a wrong "Renamed A to B" from a shuffle.
 */
import type { DiscountType } from "@/lib/types";
import { formatCents } from "@/lib/money";

export type ChangeLine = {
  description: string;
  quantity: number;
  rateCents: number;
  discountType: DiscountType;
  discountValue: number;
  productId: string | null;
};

// Resolves a catalog product id to its display name for change messages.
export type ProductNames = (id: string) => string | undefined;

export type QuoteSnapshot = {
  clientId: string;
  taxRatePercent: number;
  orderDiscountType: DiscountType;
  orderDiscountValue: number;
  notes: string;
  validUntil: string;
  lineItems: ChangeLine[];
};

const lineLabel = (line: ChangeLine) => line.description.trim() || "a line item";

function groupByDescription(lines: ChangeLine[]): Map<string, ChangeLine[]> {
  const map = new Map<string, ChangeLine[]>();
  for (const line of lines) {
    const list = map.get(line.description);
    if (list) list.push(line);
    else map.set(line.description, [line]);
  }
  return map;
}

// Name each field that differs between two lines already matched by description.
function diffLineFields(before: ChangeLine, after: ChangeLine, productNames?: ProductNames): string[] {
  const out: string[] = [];
  const name = lineLabel(after);

  // Applying a catalog item changes the rate (and product link) together, so
  // report it as one action rather than a bare "rate changed".
  const appliedCatalog = after.productId !== null && after.productId !== before.productId;
  if (appliedCatalog) {
    const product = productNames?.(after.productId as string) ?? "a catalog item";
    out.push(`Applied catalog item “${product}” to “${name}”`);
  } else if (before.rateCents !== after.rateCents) {
    out.push(
      `Changed rate of “${name}” from ${formatCents(before.rateCents)} to ${formatCents(after.rateCents)}`,
    );
  }

  if (before.quantity !== after.quantity) {
    out.push(`Changed quantity of “${name}” from ${before.quantity} to ${after.quantity}`);
  }
  if (before.discountType !== after.discountType || before.discountValue !== after.discountValue) {
    out.push(`Updated the discount on “${name}”`);
  }
  return out;
}

// Match lines by description, then diff matched pairs and report the rest as
// added/removed. See the file header for why matching is by description.
function diffLineItems(
  before: ChangeLine[],
  after: ChangeLine[],
  productNames?: ProductNames,
): string[] {
  const out: string[] = [];
  const beforeByDesc = groupByDescription(before);
  const afterByDesc = groupByDescription(after);
  const descriptions = new Set<string>([...beforeByDesc.keys(), ...afterByDesc.keys()]);

  for (const desc of descriptions) {
    const bs = beforeByDesc.get(desc) ?? [];
    const as = afterByDesc.get(desc) ?? [];
    const paired = Math.min(bs.length, as.length);
    for (let i = 0; i < paired; i++) out.push(...diffLineFields(bs[i], as[i], productNames));
    for (let i = paired; i < as.length; i++) out.push(`Added “${lineLabel(as[i])}”`);
    for (let i = paired; i < bs.length; i++) out.push(`Removed “${lineLabel(bs[i])}”`);
  }
  return out;
}

export function summarizeChanges(
  before: QuoteSnapshot,
  after: QuoteSnapshot,
  productNames?: ProductNames,
): string[] {
  const changes: string[] = [];

  if (before.clientId !== after.clientId) changes.push("Changed the client");

  if (before.taxRatePercent !== after.taxRatePercent) {
    changes.push(`Set tax rate to ${after.taxRatePercent}%`);
  }

  const hadDiscount = before.orderDiscountType !== "none";
  const hasDiscount = after.orderDiscountType !== "none";
  if (!hadDiscount && hasDiscount) changes.push("Added an order discount");
  else if (hadDiscount && !hasDiscount) changes.push("Removed the order discount");
  else if (
    before.orderDiscountType !== after.orderDiscountType ||
    before.orderDiscountValue !== after.orderDiscountValue
  ) {
    changes.push("Updated the order discount");
  }

  if (before.notes !== after.notes) {
    changes.push(after.notes.trim() ? "Updated the notes" : "Cleared the notes");
  }

  if (before.validUntil !== after.validUntil) changes.push("Changed the valid-until date");

  changes.push(...diffLineItems(before.lineItems, after.lineItems, productNames));

  return changes;
}
