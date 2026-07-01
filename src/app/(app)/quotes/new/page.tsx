/**
 * quotes/new/page.tsx — new quote route.
 *
 * What:        Renders the same QuoteEditor as an existing quote, in new-quote
 *              mode (id = null). No database row is created until the user first
 *              saves or finalizes, so abandoned starts leave no orphan drafts.
 * Where used:  The /quotes/new route.
 */
import { listClients } from "@/actions/clients";
import { listProducts } from "@/actions/products";
import { QuoteEditor } from "@/components/QuoteEditor";
import { toClientOption } from "@/lib/client-option";
import { toProductOption } from "@/lib/product-option";

export default async function NewQuotePage() {
  const [clientsRes, productsRes] = await Promise.all([listClients(), listProducts()]);

  // Fall back to empty lists so the editor still renders, but log a real failure
  // rather than silently masquerading as an empty state.
  if (!clientsRes.ok) console.error(`Failed to load clients: ${clientsRes.error}`);
  if (!productsRes.ok) console.error(`Failed to load products: ${productsRes.error}`);

  const clients = clientsRes.ok ? clientsRes.data : [];
  const products = productsRes.ok ? productsRes.data : [];

  return (
    <QuoteEditor
      id={null}
      number=""
      status="draft"
      updatedAt=""
      clientId=""
      clients={clients.map(toClientOption)}
      products={products.map(toProductOption)}
      taxRatePercent={0}
      orderDiscountType="none"
      orderDiscountValue={0}
      notes=""
      validUntil=""
      lines={[]}
      activity={[]}
    />
  );
}
