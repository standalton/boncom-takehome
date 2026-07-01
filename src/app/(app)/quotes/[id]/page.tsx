/**
 * quotes/[id]/page.tsx — quote editor route.
 *
 * What:        Loads a quote (with its line items) and the client list on the
 *              server, then hands them to the client-side QuoteEditor.
 * Where used:  The /quotes/[id] route.
 */
import { notFound } from "next/navigation";
import { getQuote, listActivity } from "@/actions/quote-queries";
import { listClients } from "@/actions/clients";
import { listProducts } from "@/actions/products";
import { QuoteEditor } from "@/components/QuoteEditor";
import { toClientOption } from "@/lib/client-option";
import { toProductOption } from "@/lib/product-option";
import type { Quote, LineItem } from "@/lib/types";

type QuoteRow = Quote & { line_items: LineItem[] };

export default async function QuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [quoteRes, clientsRes, productsRes, activityRes] = await Promise.all([
    getQuote(id),
    listClients(),
    listProducts(),
    listActivity(id),
  ]);
  if (!quoteRes.ok) notFound();

  // Secondary lists fall back to empty so the editor still renders, but a real
  // failure is logged rather than silently masquerading as an empty state.
  if (!clientsRes.ok) console.error(`Failed to load clients: ${clientsRes.error}`);
  if (!productsRes.ok) console.error(`Failed to load products: ${productsRes.error}`);
  if (!activityRes.ok) console.error(`Failed to load activity: ${activityRes.error}`);

  const q = quoteRes.data as unknown as QuoteRow;
  const clients = clientsRes.ok ? clientsRes.data : [];
  const products = productsRes.ok ? productsRes.data : [];
  const activity = activityRes.ok ? activityRes.data : [];

  const lines = (q.line_items ?? [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((li) => ({
      description: li.description,
      quantity: Number(li.quantity),
      rateCents: li.rate_cents,
      discountType: li.discount_type,
      discountValue: Number(li.discount_value),
      productId: li.product_id,
    }));

  return (
    <QuoteEditor
      id={q.id}
      number={q.number}
      status={q.status}
      updatedAt={q.updated_at}
      clientId={q.client_id}
      clients={clients.map(toClientOption)}
      products={products.map(toProductOption)}
      taxRatePercent={Number(q.tax_rate)}
      orderDiscountType={q.discount_type}
      orderDiscountValue={Number(q.discount_value)}
      notes={q.notes ?? ""}
      validUntil={q.valid_until ?? ""}
      lines={lines}
      activity={activity}
    />
  );
}
