/**
 * QuoteInvoiceView.tsx — read-only invoice presentation of a quote.
 *
 * What:        Renders a finalized quote as a standard invoice: a Bill-to block,
 *              a clean line-item table (Description / Qty / Rate / Amount where
 *              Amount = Qty × Rate), and a totals summary that carries the
 *              discount and tax. Mirrors the exported PDF.
 * Where used:  The quote editor shows this instead of the editable form once a
 *              quote is no longer a draft (finalized / sent / …).
 * Notes:       Line rows show gross amounts; all discounts (per-line + order)
 *              are consolidated into the summary "Discount" line, the way most
 *              invoices (Stripe, QuickBooks) present them. Totals come in already
 *              computed from lib/pricing.
 */
"use client";

import { formatCents } from "@/lib/money";

const eyebrow = "text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground";

export type InvoiceLine = {
  description: string;
  quantity: number;
  rateCents: number;
  lineNetCents: number;
};

const lineGross = (line: InvoiceLine) => Math.round(line.quantity * line.rateCents);
const lineDiscount = (line: InvoiceLine) => Math.max(0, lineGross(line) - line.lineNetCents);

type Props = {
  client?: { company: string; contactName: string | null; email: string | null; phone: string | null };
  lines: InvoiceLine[];
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
  taxRatePercent: number;
  notes: string;
};

export function QuoteInvoiceView({
  client,
  lines,
  subtotalCents,
  discountCents,
  taxCents,
  totalCents,
  taxRatePercent,
  notes,
}: Props) {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className={eyebrow}>Bill to</div>
        <div className="mt-1.5 text-lg font-medium text-primary">{client?.company ?? "—"}</div>
        {client?.contactName && <div className="text-sm text-muted-foreground">{client.contactName}</div>}
        {client?.email && <div className="text-sm text-muted-foreground">{client.email}</div>}
        {client?.phone && <div className="text-sm text-muted-foreground">{client.phone}</div>}

        <div className="mt-6 overflow-hidden rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-primary text-left text-primary-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Description</th>
                <th className="w-14 px-4 py-2.5 text-right font-medium">Qty</th>
                <th className="w-28 px-4 py-2.5 text-right font-medium">Rate</th>
                <th className="w-28 px-4 py-2.5 text-right font-medium">Discount</th>
                <th className="w-28 px-4 py-2.5 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {lines.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    No line items.
                  </td>
                </tr>
              ) : (
                lines.map((line, i) => {
                  const disc = lineDiscount(line);
                  return (
                    <tr key={i}>
                      <td className="px-4 py-3 font-medium text-foreground">
                        {line.description || "—"}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{line.quantity}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatCents(line.rateCents)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                        {disc > 0 ? `−${formatCents(disc)}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums">
                        {formatCents(line.lineNetCents)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-5 flex justify-end">
          <dl className="w-80 space-y-1.5 text-sm">
            <div className="flex justify-between gap-8">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="tabular-nums">{formatCents(subtotalCents)}</dd>
            </div>
            {discountCents > 0 && (
              <div className="flex justify-between gap-8">
                <dt className="text-muted-foreground">Order discount</dt>
                <dd className="tabular-nums">−{formatCents(discountCents)}</dd>
              </div>
            )}
            <div className="flex justify-between gap-8">
              <dt className="text-muted-foreground">Tax ({taxRatePercent}%)</dt>
              <dd className="tabular-nums">{formatCents(taxCents)}</dd>
            </div>
            <div className="mt-1 flex justify-between gap-8 border-t-2 border-primary pt-2">
              <dt className="font-semibold text-primary">Total</dt>
              <dd className="text-lg font-semibold text-primary tabular-nums">{formatCents(totalCents)}</dd>
            </div>
          </dl>
        </div>
      </section>

      {notes.trim() && (
        <section className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className={eyebrow}>Notes</div>
          <p className="mt-1.5 text-sm whitespace-pre-wrap text-muted-foreground">{notes}</p>
        </section>
      )}
    </div>
  );
}
