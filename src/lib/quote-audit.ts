/**
 * quote-audit.ts — write-side helpers for the quote activity log.
 *
 * What:        `recordActivity` appends a (best-effort) audit entry;
 *              `snapshotChanges` diffs a save against the prior DB state and
 *              resolves catalog product names for the change strings.
 * Where used:  actions/quotes.ts (createQuote / saveQuote / setStatus / duplicate).
 * Notes:       Not a "use server" module — these are helpers CALLED by server
 *              actions (they take the request's Supabase client), not actions
 *              themselves. Pure diffing lives in lib/quote-changes.ts.
 */
import type { createClient } from "@/lib/supabase/server";
import { summarizeChanges, type QuoteSnapshot } from "@/lib/quote-changes";
import type { QuoteInput } from "@/lib/validation";
import type { DiscountType } from "@/lib/types";

export type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type ActivityEntryInput = {
  quote_id: string;
  user_id: string | undefined;
  action: string;
  detail: Record<string, unknown>;
};

// Append an audit entry. The history is a best-effort side record: a failure
// here must NOT fail (or roll back) the user's primary action, but it also must
// not be swallowed silently — so we surface it in the server logs.
export async function recordActivity(supabase: SupabaseServerClient, entry: ActivityEntryInput) {
  const { error } = await supabase.from("activity_log").insert(entry);
  if (error) {
    console.error(`activity_log insert failed for quote ${entry.quote_id}: ${error.message}`);
  }
}

type PrevLine = {
  description: string;
  quantity: number;
  rate_cents: number;
  discount_type: DiscountType;
  discount_value: number;
  position: number;
  product_id: string | null;
};

export type PrevQuoteRow = {
  client_id: string;
  tax_rate: number | string;
  discount_type: DiscountType;
  discount_value: number | string;
  notes: string | null;
  valid_until: string | null;
  line_items: PrevLine[] | null;
};

// Diff a save against the prior state, naming which catalog products were applied.
export async function snapshotChanges(
  supabase: SupabaseServerClient,
  prev: PrevQuoteRow,
  q: QuoteInput,
): Promise<string[]> {
  const before: QuoteSnapshot = {
    clientId: prev.client_id,
    taxRatePercent: Number(prev.tax_rate),
    orderDiscountType: prev.discount_type,
    orderDiscountValue: Number(prev.discount_value),
    notes: prev.notes ?? "",
    validUntil: prev.valid_until ?? "",
    lineItems: (prev.line_items ?? [])
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((li) => ({
        description: li.description,
        quantity: Number(li.quantity),
        rateCents: li.rate_cents,
        discountType: li.discount_type,
        discountValue: Number(li.discount_value),
        productId: li.product_id,
      })),
  };

  // Resolve names for any catalog products applied this save, so the change log
  // can say which product was used rather than just "rate changed".
  const productIds = [
    ...new Set(q.lineItems.map((li) => li.productId).filter((x): x is string => !!x)),
  ];
  const productNames = new Map<string, string>();
  if (productIds.length > 0) {
    const { data: prods, error: prodErr } = await supabase
      .from("products")
      .select("id, name")
      .in("id", productIds);
    // Non-fatal: the quote is already saved; a lookup miss just degrades the
    // history text to a generic label. Log it rather than swallow it.
    if (prodErr) console.error(`product name lookup failed: ${prodErr.message}`);
    for (const p of (prods ?? []) as { id: string; name: string }[]) productNames.set(p.id, p.name);
  }

  return summarizeChanges(
    before,
    {
      clientId: q.clientId,
      taxRatePercent: q.taxRatePercent,
      orderDiscountType: q.orderDiscountType,
      orderDiscountValue: q.orderDiscountValue,
      notes: q.notes,
      validUntil: q.validUntil,
      lineItems: q.lineItems.map((li) => ({
        description: li.description,
        quantity: li.quantity,
        rateCents: li.rateCents,
        discountType: li.discountType,
        discountValue: li.discountValue,
        productId: li.productId ?? null,
      })),
    },
    (pid) => productNames.get(pid),
  );
}
