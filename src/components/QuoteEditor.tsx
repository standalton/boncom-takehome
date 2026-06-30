/**
 * QuoteEditor.tsx — the core quote editor.
 *
 * What:        Edit a quote's number, client, line items (each with an optional
 *              discount), order-level discount, tax, notes, and status. Totals
 *              update live in a sticky bottom bar that stays pinned as you edit.
 * Where used:  The /quotes/[id] route.
 * Notes:       Totals come from the SAME lib/pricing.computeTotals the server
 *              uses, so the preview and the saved figure cannot diverge.
 *              Column alignment uses inline gridTemplateColumns (cache-proof).
 */
"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Send, Download, CheckCircle2 } from "lucide-react";
import { computeTotals } from "@/lib/pricing";
import { formatCents } from "@/lib/money";
import { helpText } from "@/lib/help-text";
import { saveQuote, setStatus } from "@/actions/quotes";
import type { Client, DiscountType, QuoteStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MoneyInput } from "@/components/MoneyInput";
import { NumberInput } from "@/components/NumberInput";
import { selectAllOnFocus } from "@/lib/field-helpers";
import { HelpHint } from "@/components/HelpHint";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { LineItemRow, type LineItemPatch } from "@/components/LineItemRow";
import { ClientPicker } from "@/components/ClientPicker";
import { toClientOption, type ClientOption } from "@/lib/client-option";
import { SendQuoteDialog } from "@/components/SendQuoteDialog";
import { StatusSelect, StatusBadge, statusMeta } from "@/components/StatusSelect";
import { exportQuotePdf } from "@/lib/export-quote";
import { DateField } from "@/components/DateField";

type EditorLine = {
  key: string;
  description: string;
  quantity: number;
  rateCents: number;
  discountType: DiscountType;
  discountValue: number;
};

export type QuoteEditorProps = {
  id: string;
  number: string;
  status: QuoteStatus;
  clientId: string;
  clients: ClientOption[];
  taxRatePercent: number;
  orderDiscountType: DiscountType;
  orderDiscountValue: number;
  notes: string;
  validUntil: string;
  lines: Omit<EditorLine, "key">[];
};

const eyebrow =
  "flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground";

let keyCounter = 0;
const newKey = () => `line-${keyCounter++}`;

export function QuoteEditor(props: QuoteEditorProps) {
  const [number, setNumber] = useState(props.number);
  const [clients, setClients] = useState<ClientOption[]>(props.clients);
  const [clientId, setClientId] = useState(props.clientId);
  const [status, setStatusState] = useState<QuoteStatus>(props.status);
  const [sendOpen, setSendOpen] = useState(false);
  const [validUntil, setValidUntil] = useState(props.validUntil);
  const [taxRatePercent, setTaxRatePercent] = useState(props.taxRatePercent);
  const [orderDiscountType, setOrderDiscountType] = useState<DiscountType>(props.orderDiscountType);
  const [orderDiscountValue, setOrderDiscountValue] = useState(props.orderDiscountValue);
  const [notes, setNotes] = useState(props.notes);
  const [lines, setLines] = useState<EditorLine[]>(props.lines.map((l) => ({ ...l, key: newKey() })));
  const [dirty, setDirty] = useState(false);
  const [saving, startSave] = useTransition();
  const [statusPending, startStatus] = useTransition();
  const selectedClient = clients.find((c) => c.id === clientId);

  const totals = useMemo(
    () =>
      computeTotals({
        lineItems: lines.map((l) => ({
          quantity: l.quantity,
          rateCents: l.rateCents,
          discountType: l.discountType,
          discountValue: l.discountValue,
        })),
        orderDiscountType,
        orderDiscountValue,
        taxRatePercent,
      }),
    [lines, orderDiscountType, orderDiscountValue, taxRatePercent],
  );

  function updateLine(key: string, patch: LineItemPatch) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
    setDirty(true);
  }
  function addLine() {
    setLines((prev) => [
      ...prev,
      { key: newKey(), description: "", quantity: 1, rateCents: 0, discountType: "none", discountValue: 0 },
    ]);
    setDirty(true);
  }
  function removeLine(key: string) {
    setLines((prev) => prev.filter((l) => l.key !== key));
    setDirty(true);
  }
  function addClient(client: Client) {
    setClients((prev) => [...prev, toClientOption(client)]);
    setDirty(true);
  }

  function save() {
    startSave(async () => {
      const res = await saveQuote(props.id, {
        number,
        clientId,
        taxRatePercent,
        orderDiscountType,
        orderDiscountValue,
        notes,
        validUntil,
        lineItems: lines.map((l) => ({
          description: l.description,
          quantity: l.quantity,
          rateCents: l.rateCents,
          discountType: l.discountType,
          discountValue: l.discountValue,
        })),
      });
      if (res.ok) {
        toast.success("Saved");
        setDirty(false);
      } else {
        toast.error(res.error);
      }
    });
  }

  // Moving a quote to "Sent" opens a send confirmation; every other transition
  // applies immediately.
  async function exportPdf() {
    const pretty = (iso: string) =>
      iso
        ? new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : "";
    try {
      await exportQuotePdf({
        number,
        statusLabel: statusMeta[status].label,
        issuedOn: pretty(new Date().toISOString().slice(0, 10)),
        validUntil: pretty(validUntil),
        client: selectedClient
          ? {
              company: selectedClient.company,
              contactName: selectedClient.contactName,
              email: selectedClient.email,
              phone: selectedClient.phone,
            }
          : undefined,
        lines: lines.map((l, i) => ({
          description: l.description,
          quantity: l.quantity,
          rateCents: l.rateCents,
          discountLabel:
            l.discountType === "none"
              ? ""
              : l.discountType === "percent"
                ? `${l.discountValue}% discount`
                : `${formatCents(l.discountValue)} discount`,
          lineNetCents: totals.lineNetsCents[i] ?? 0,
        })),
        subtotalCents: totals.subtotalCents,
        discountCents: totals.discountCents,
        taxCents: totals.taxCents,
        totalCents: totals.totalCents,
        taxRatePercent,
      });
      toast.success(`Exported ${number}.pdf`);
    } catch {
      toast.error("Could not export the PDF.");
    }
  }

  function applyStatus(next: QuoteStatus, onSent?: () => void) {
    if (next === status && next !== "sent") return;
    const previous = status;
    setStatusState(next);
    startStatus(async () => {
      const res = await setStatus(props.id, next);
      if (res.ok) {
        if (next === "sent") {
          toast.success(`Quote sent to ${selectedClient?.company ?? "the client"}`);
          onSent?.();
        } else {
          toast.success(`Marked ${next}`);
        }
      } else {
        toast.error(res.error);
        setStatusState(previous);
      }
    });
  }

  return (
    <>
      <div className="px-8 pt-8 pb-32">
        {/* Header */}
        <div className="mx-auto mb-8 flex max-w-3xl flex-wrap items-center justify-between gap-6 border-b pb-6">
          <div className="min-w-0">
            <div className={eyebrow}>Quote</div>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <input
                aria-label="Quote number"
                value={number}
                {...selectAllOnFocus}
                onChange={(e) => {
                  setNumber(e.target.value);
                  setDirty(true);
                }}
                className="min-w-[6ch] rounded-lg border border-input bg-background px-2.5 py-1 text-3xl font-light tracking-tight text-primary outline-none transition-colors [field-sizing:content] hover:border-ring/70 hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40"
              />
              {dirty && (
                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
                  Unsaved
                </span>
              )}
            </div>
          </div>

          {/* Status + validity, side by side */}
          <div className="flex shrink-0 flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <label className={eyebrow}>
                Status <HelpHint text={helpText.status} />
              </label>
              <div className="flex items-center gap-2">
                {status === "draft" || status === "finalized" ? (
                  <StatusBadge status={status} />
                ) : (
                  <StatusSelect value={status} onSelect={applyStatus} disabled={statusPending} />
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className={eyebrow}>
                Valid until <HelpHint text={helpText.validUntil} />
              </label>
              <DateField
                value={validUntil}
                onChange={(v) => {
                  setValidUntil(v);
                  setDirty(true);
                }}
              />
            </div>
            <Button onClick={save} disabled={saving} className="h-9 self-end">
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>

        {/* Body */}
        <div className="mx-auto max-w-3xl space-y-8">
          <div className="space-y-2">
            <label className={eyebrow}>
              Client <HelpHint text={helpText.client} />
            </label>
            <ClientPicker
              clients={clients}
              value={clientId}
              onChange={(id) => {
                setClientId(id);
                setDirty(true);
              }}
              onClientAdded={addClient}
            />
          </div>

          {/* Line items */}
          <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
            <div className="border-b bg-muted/30 px-4 py-2.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Line items
              </span>
            </div>
            {lines.length === 0 ? (
              <div className="px-4 py-12 text-center text-sm text-muted-foreground">
                No line items yet. Add one to start building the quote.
              </div>
            ) : (
              lines.map((l, i) => (
                <LineItemRow
                  key={l.key}
                  description={l.description}
                  quantity={l.quantity}
                  rateCents={l.rateCents}
                  discountType={l.discountType}
                  discountValue={l.discountValue}
                  lineNetCents={totals.lineNetsCents[i] ?? 0}
                  onChange={(patch) => updateLine(l.key, patch)}
                  onRemove={() => removeLine(l.key)}
                />
              ))
            )}
            <div className="p-3">
              <Button
                variant="ghost"
                onClick={addLine}
                className="w-full justify-center border border-dashed text-muted-foreground hover:text-foreground"
              >
                <Plus className="size-4" />
                Add line
              </Button>
            </div>
          </section>

          {/* Discount & tax */}
          <section className="grid gap-5 rounded-2xl border bg-card p-5 shadow-sm sm:grid-cols-2">
            <div className="space-y-2">
              <label className={eyebrow}>
                Discount <HelpHint text={helpText.orderDiscount} />
              </label>
              <div className="flex gap-2">
                <select
                  className="h-10 w-28 rounded-lg border border-input bg-transparent px-2 text-sm outline-none transition-colors hover:bg-muted/40 focus-visible:border-ring"
                  value={orderDiscountType}
                  onChange={(e) => {
                    setOrderDiscountType(e.target.value as DiscountType);
                    setOrderDiscountValue(0);
                    setDirty(true);
                  }}
                >
                  <option value="none">None</option>
                  <option value="percent">Percent</option>
                  <option value="fixed">Amount</option>
                </select>
                {orderDiscountType === "percent" && (
                  <NumberInput
                    className="h-10 flex-1"
                    placeholder="0"
                    value={orderDiscountValue}
                    onChangeNumber={(n) => {
                      setOrderDiscountValue(n);
                      setDirty(true);
                    }}
                  />
                )}
                {orderDiscountType === "fixed" && (
                  <MoneyInput
                    className="h-10 w-full"
                    valueCents={orderDiscountValue}
                    onChangeCents={(cents) => {
                      setOrderDiscountValue(cents);
                      setDirty(true);
                    }}
                  />
                )}
              </div>
              {totals.discountCents > 0 && (
                <p className="text-xs text-muted-foreground tabular-nums">
                  −{formatCents(totals.discountCents)} applied
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className={eyebrow}>
                Tax rate (%) <HelpHint text={helpText.taxRate} />
              </label>
              <NumberInput
                className="h-10"
                placeholder="0"
                value={taxRatePercent}
                onChangeNumber={(n) => {
                  setTaxRatePercent(n);
                  setDirty(true);
                }}
              />
              <p className="text-xs text-muted-foreground tabular-nums">
                {formatCents(totals.taxCents)} tax
              </p>
            </div>
          </section>

          {/* Notes */}
          <div className="space-y-2">
            <label className={eyebrow}>
              Notes <HelpHint text={helpText.notes} />
            </label>
            <Textarea
              className="min-h-24 rounded-lg"
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                setDirty(true);
              }}
              placeholder="Internal notes (not shown to the client)…"
            />
          </div>
        </div>
      </div>

      {/* Sticky bottom total bar */}
      <div className="fixed right-0 bottom-0 left-60 z-20 border-t bg-card/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-8 py-3">
          <div className="hidden items-center gap-5 text-sm text-muted-foreground sm:flex">
            <span>
              Subtotal{" "}
              <span className="font-medium text-foreground tabular-nums">
                {formatCents(totals.subtotalCents)}
              </span>
            </span>
            {totals.discountCents > 0 && (
              <span>
                Disc{" "}
                <span className="font-medium text-foreground tabular-nums">
                  −{formatCents(totals.discountCents)}
                </span>
              </span>
            )}
            <span>
              Tax{" "}
              <span className="font-medium text-foreground tabular-nums">
                {formatCents(totals.taxCents)}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-5">
            <div className="text-right leading-none">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Total
              </div>
              <div
                data-testid="grand-total"
                className="mt-1 text-2xl font-light text-primary tabular-nums transition-all"
              >
                {formatCents(totals.totalCents)}
              </div>
            </div>
            {status === "draft" && (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      size="lg"
                      disabled={statusPending}
                      onClick={() => applyStatus("finalized")}
                    />
                  }
                >
                  <CheckCircle2 className="size-4" />
                  Finalize
                </TooltipTrigger>
                <TooltipContent>{helpText.finalize}</TooltipContent>
              </Tooltip>
            )}
            {status === "finalized" && (
              <>
                <Button size="lg" variant="outline" onClick={exportPdf}>
                  <Download className="size-4" />
                  Export
                </Button>
                <Button size="lg" disabled={statusPending} onClick={() => setSendOpen(true)}>
                  <Send className="size-4" />
                  Send
                </Button>
              </>
            )}
            {status !== "draft" && status !== "finalized" && (
              <Button size="lg" variant="outline" onClick={exportPdf}>
                <Download className="size-4" />
                Export
              </Button>
            )}
          </div>
        </div>
      </div>

      <SendQuoteDialog
        open={sendOpen}
        onOpenChange={setSendOpen}
        quoteNumber={number}
        client={selectedClient}
        pending={statusPending}
        onConfirm={() => applyStatus("sent", () => setSendOpen(false))}
        onExport={exportPdf}
      />
    </>
  );
}
