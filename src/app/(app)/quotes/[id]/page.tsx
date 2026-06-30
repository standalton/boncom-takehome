/**
 * quotes/[id]/page.tsx — quote editor route.
 *
 * What:        Loads a quote (with its line items) and the client list on the
 *              server, then hands them to the client-side QuoteEditor.
 * Where used:  The /quotes/[id] route.
 */
import { notFound } from "next/navigation";
import { getQuote } from "@/actions/quotes";
import { listClients } from "@/actions/clients";
import { QuoteEditor } from "@/components/QuoteEditor";
import { toClientOption } from "@/lib/client-option";
import type { Quote, LineItem } from "@/lib/types";

type QuoteRow = Quote & { line_items: LineItem[] };

export default async function QuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [quoteRes, clientsRes] = await Promise.all([getQuote(id), listClients()]);
  if (!quoteRes.ok) notFound();

  const q = quoteRes.data as unknown as QuoteRow;
  const clients = clientsRes.ok ? clientsRes.data : [];

  const lines = (q.line_items ?? [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((li) => ({
      description: li.description,
      quantity: Number(li.quantity),
      rateCents: li.rate_cents,
      discountType: li.discount_type,
      discountValue: Number(li.discount_value),
    }));

  return (
    <QuoteEditor
      id={q.id}
      number={q.number}
      status={q.status}
      clientId={q.client_id}
      clients={clients.map(toClientOption)}
      taxRatePercent={Number(q.tax_rate)}
      orderDiscountType={q.discount_type}
      orderDiscountValue={Number(q.discount_value)}
      notes={q.notes ?? ""}
      validUntil={q.valid_until ?? ""}
      lines={lines}
    />
  );
}
