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
import { Plus } from "lucide-react";
import { computeTotals } from "@/lib/pricing";
import { formatCents } from "@/lib/money";
import { helpText } from "@/lib/help-text";
import { saveQuote } from "@/actions/quotes";
import type { Client, DiscountType, QuoteStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MoneyInput } from "@/components/MoneyInput";
import { HelpHint } from "@/components/HelpHint";
import { LineItemRow, type LineItemPatch } from "@/components/LineItemRow";
import { ClientPicker, type ClientOption } from "@/components/ClientPicker";

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
  const [taxRatePercent, setTaxRatePercent] = useState(props.taxRatePercent);
  const [orderDiscountType, setOrderDiscountType] = useState<DiscountType>(props.orderDiscountType);
  const [orderDiscountValue, setOrderDiscountValue] = useState(props.orderDiscountValue);
  const [notes, setNotes] = useState(props.notes);
  const [lines, setLines] = useState<EditorLine[]>(props.lines.map((l) => ({ ...l, key: newKey() })));
  const [dirty, setDirty] = useState(false);
  const [saving, startSave] = useTransition();

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
    setClients((prev) => [
      ...prev,
      { id: client.id, company: client.company, contactName: client.contact_name },
    ]);
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

  return (
    <>
      <div className="px-8 pt-8 pb-32">
        {/* Header */}
        <div className="mx-auto mb-8 flex max-w-3xl flex-wrap items-start justify-between gap-4 border-b pb-5">
          <div>
            <div className={eyebrow}>Quote</div>
            <div className="mt-1 flex items-center gap-3">
              <input
                aria-label="Quote number"
                value={number}
                onChange={(e) => {
                  setNumber(e.target.value);
                  setDirty(true);
                }}
                className="min-w-[6ch] rounded-lg border border-input bg-background px-2.5 py-1 text-3xl font-light tracking-tight text-primary outline-none transition-colors [field-sizing:content] hover:bg-muted/30 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40"
              />
              {dirty && (
                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
                  Unsaved
                </span>
              )}
            </div>
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
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    className="h-10 flex-1"
                    placeholder="0"
                    value={orderDiscountValue || ""}
                    onChange={(e) => {
                      setOrderDiscountValue(Number(e.target.value));
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
              <Input
                type="number"
                min={0}
                max={100}
                className="h-10"
                placeholder="0"
                value={taxRatePercent || ""}
                onChange={(e) => {
                  setTaxRatePercent(Number(e.target.value));
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
            <Button size="lg" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
