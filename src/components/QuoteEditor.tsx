/**
 * QuoteEditor.tsx — the core quote editor.
 *
 * What:        Composes the header, the editable form (draft) or read-only
 *              invoice view (finalized), the sticky totals bar, and the send
 *              dialog. All state + persistence live in useQuoteEditor.
 * Where used:  The /quotes/[id] route (existing quote) and /quotes/new (a new
 *              quote, rendered with a null id until its first save).
 */
"use client";

import { Fragment } from "react";
import Link from "next/link";
import { Send, AlertTriangle } from "lucide-react";
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

  // A status strip that docks directly above the sticky totals bar (part of the
  // fixed footer, always visible) — a duplicate-send warning on a draft, or a
  // sent-and-locked notice once the quote has gone out.
  const footerBanner =
    q.status === "draft" && q.sentSiblings.length > 0 ? (
      <div className="border-t border-amber-200 bg-amber-50 text-amber-800">
        <div className="flex items-center justify-center gap-2 px-8 py-2.5 text-center text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            {q.selectedClient?.company ?? "This client"}
            {" already has a quote that's been sent: "}
            {q.sentSiblings.map((s, i) => (
              <Fragment key={s.id}>
                {i > 0 && ", "}
                <Link
                  href={`/quotes/${s.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium underline underline-offset-2 hover:text-amber-900"
                >
                  {s.number}
                </Link>
              </Fragment>
            ))}
            {". Make sure you're not sending a duplicate."}
          </span>
        </div>
      </div>
    ) : q.alreadySent ? (
      <div className="border-t border-blue-200 bg-blue-50 text-blue-800">
        <div className="flex items-center justify-center gap-2 px-8 py-2.5 text-center text-sm">
          <Send className="size-4 shrink-0" />
          {`This quote was sent to ${q.selectedClient?.company ?? "the client"} and can no longer be edited.`}
        </div>
      </div>
    ) : null;

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
          // Re-sending an already-sent quote routes through the confirm dialog.
          onStatusSelect={(s) => (s === "sent" ? q.setSendOpen(true) : q.applyStatus(s))}
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
            clientError={q.fieldError("clientId")}
            onClientChange={q.changeClient}
            onClientBlur={() => q.markTouched("clientId")}
            onClientAdded={q.addClient}
            products={q.products}
            lines={q.lines}
            lineNets={totals.lineNetsCents}
            onUpdateLine={q.updateLine}
            onAddLine={q.addLine}
            onRemoveLine={q.removeLine}
            lineErrors={q.lineErrors}
            onLineBlur={(key, field) => q.markTouched(`${key}:${field}`)}
            discountType={q.orderDiscountType}
            discountValue={q.orderDiscountValue}
            taxRatePercent={q.taxRatePercent}
            discountCents={totals.discountCents}
            taxCents={totals.taxCents}
            discountError={q.fieldError("orderDiscount")}
            taxError={q.fieldError("taxRatePercent")}
            onDiscountChange={q.changeDiscount}
            onDiscountBlur={() => q.markTouched("orderDiscount")}
            onTaxChange={q.changeTax}
            onTaxBlur={() => q.markTouched("taxRatePercent")}
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
        banner={footerBanner}
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
        resend={q.alreadySent}
        onConfirm={() => q.applyStatus("sent", () => q.setSendOpen(false))}
        onExport={q.exportPdf}
      />
    </>
  );
}
