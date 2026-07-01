/**
 * QuoteEditor.tsx — the core quote editor.
 *
 * What:        Composes the header, the editable form (draft) or read-only
 *              invoice view (finalized), the sticky totals bar, and the send
 *              dialog. All state + persistence live in useQuoteEditor.
 * Where used:  The /quotes/[id] route.
 */
"use client";

import { useQuoteEditor, type QuoteEditorInit } from "@/lib/use-quote-editor";
import { SendQuoteDialog } from "@/components/SendQuoteDialog";
import { QuoteEditorHeader } from "@/components/QuoteEditorHeader";
import { QuoteEditorForm } from "@/components/QuoteEditorForm";
import { QuoteInvoiceView } from "@/components/QuoteInvoiceView";
import { QuoteTotalsBar } from "@/components/QuoteTotalsBar";
import type { ActivityEntry } from "@/components/QuoteActivity";

export type QuoteEditorProps = QuoteEditorInit & { activity: ActivityEntry[] };

export function QuoteEditor({ activity, ...props }: QuoteEditorProps) {
  const q = useQuoteEditor(props);
  const { totals } = q;

  return (
    <>
      <div className="px-8 pt-8 pb-32">
        <QuoteEditorHeader
          id={props.id}
          number={props.number}
          activity={activity}
          status={q.status}
          locked={q.locked}
          dirty={q.dirty}
          mounted={q.mounted}
          lastSavedAt={q.lastSavedAt}
          validUntil={q.validUntil}
          onValidUntilChange={q.changeValidUntil}
          onStatusSelect={q.applyStatus}
          statusPending={q.statusPending}
          saving={q.saving}
          onSave={q.save}
          onEdit={() => q.applyStatus("draft")}
        />

        {q.locked ? (
          <QuoteInvoiceView
            client={q.selectedClient}
            lines={q.lines.map((l, i) => ({
              description: l.description,
              quantity: l.quantity,
              rateCents: l.rateCents,
              lineNetCents: totals.lineNetsCents[i] ?? 0,
            }))}
            subtotalCents={totals.subtotalCents}
            discountCents={totals.discountCents}
            taxCents={totals.taxCents}
            totalCents={totals.totalCents}
            taxRatePercent={q.taxRatePercent}
            notes={q.notes}
          />
        ) : (
          <QuoteEditorForm
            clients={q.clients}
            clientId={q.clientId}
            onClientChange={q.changeClient}
            onClientAdded={q.addClient}
            products={q.products}
            lines={q.lines}
            lineNets={totals.lineNetsCents}
            onUpdateLine={q.updateLine}
            onAddLine={q.addLine}
            onRemoveLine={q.removeLine}
            discountType={q.orderDiscountType}
            discountValue={q.orderDiscountValue}
            taxRatePercent={q.taxRatePercent}
            discountCents={totals.discountCents}
            taxCents={totals.taxCents}
            onDiscountChange={q.changeDiscount}
            onTaxChange={q.changeTax}
            notes={q.notes}
            onNotesChange={q.changeNotes}
          />
        )}
      </div>

      <QuoteTotalsBar
        status={q.status}
        subtotalCents={totals.subtotalCents}
        discountCents={totals.discountCents}
        taxCents={totals.taxCents}
        totalCents={totals.totalCents}
        saving={q.saving}
        statusPending={q.statusPending}
        onFinalize={q.finalize}
        onExport={q.exportPdf}
        onSend={() => q.setSendOpen(true)}
      />

      <SendQuoteDialog
        open={q.sendOpen}
        onOpenChange={q.setSendOpen}
        quoteNumber={props.number}
        client={q.selectedClient}
        pending={q.statusPending}
        onConfirm={() => q.applyStatus("sent", () => q.setSendOpen(false))}
        onExport={q.exportPdf}
      />
    </>
  );
}
