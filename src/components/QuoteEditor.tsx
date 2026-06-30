/**
 * QuoteEditor.tsx — the core estimate editor.
 *
 * What:        Edit a quote's client, line items (each with an optional
 *              discount), order-level discount, tax, notes, and status, with
 *              totals updating live as you type. Save persists via saveQuote.
 * Where used:  The /quotes/[id] route.
 * Notes:       Totals come from the SAME lib/pricing.computeTotals the server
 *              uses, so the preview and the saved figure cannot diverge.
 */
"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { computeTotals } from "@/lib/pricing";
import { formatCents } from "@/lib/money";
import { helpText } from "@/lib/help-text";
import { saveQuote, setStatus } from "@/actions/quotes";
import type { DiscountType, QuoteStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MoneyInput } from "@/components/MoneyInput";
import { HelpHint } from "@/components/HelpHint";
import { LineItemRow, type LineItemPatch } from "@/components/LineItemRow";

type EditorLine = {
  key: string;
  description: string;
  quantity: number;
  rateCents: number;
  discountType: DiscountType;
  discountValue: number;
};

type ClientOption = { id: string; name: string; company: string | null };

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

const STATUSES: QuoteStatus[] = ["draft", "sent", "accepted", "paid", "declined"];
const selectClass =
  "h-9 rounded-md border border-input bg-transparent px-2 text-sm outline-none transition-colors hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

let keyCounter = 0;
const newKey = () => `line-${keyCounter++}`;

export function QuoteEditor(props: QuoteEditorProps) {
  const [clientId, setClientId] = useState(props.clientId);
  const [status, setStatusState] = useState<QuoteStatus>(props.status);
  const [taxRatePercent, setTaxRatePercent] = useState(props.taxRatePercent);
  const [orderDiscountType, setOrderDiscountType] = useState<DiscountType>(props.orderDiscountType);
  const [orderDiscountValue, setOrderDiscountValue] = useState(props.orderDiscountValue);
  const [notes, setNotes] = useState(props.notes);
  const [lines, setLines] = useState<EditorLine[]>(props.lines.map((l) => ({ ...l, key: newKey() })));
  const [dirty, setDirty] = useState(false);
  const [saving, startSave] = useTransition();
  const [, startStatus] = useTransition();

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

  function save() {
    startSave(async () => {
      const res = await saveQuote(props.id, {
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

  function changeStatus(next: QuoteStatus) {
    const previous = status;
    setStatusState(next);
    startStatus(async () => {
      const res = await setStatus(props.id, next);
      if (res.ok) toast.success(`Marked ${next}`);
      else {
        toast.error(res.error);
        setStatusState(previous);
      }
    });
  }

  return (
    <div className="px-8 py-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-primary">{props.number}</h1>
          {dirty && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
              Unsaved changes
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            Status <HelpHint text={helpText.status} />
          </span>
          <select
            className={selectClass}
            value={status}
            onChange={(e) => changeStatus(e.target.value as QuoteStatus)}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s[0].toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        {/* Left: client + line items */}
        <div className="space-y-6">
          <div className="space-y-2">
            <span className="flex items-center gap-1 text-sm font-medium">
              Client <HelpHint text={helpText.client} />
            </span>
            <select
              className={`${selectClass} w-full`}
              value={clientId}
              onChange={(e) => {
                setClientId(e.target.value);
                setDirty(true);
              }}
            >
              {props.clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.company ? ` — ${c.company}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-hidden rounded-xl border">
            <div className="grid grid-cols-[1fr_64px_112px_96px_28px] gap-3 border-b bg-muted/40 px-4 py-2.5 text-xs font-medium text-muted-foreground">
              <span>Description</span>
              <span className="text-center">Qty</span>
              <span>Rate</span>
              <span className="text-right">Total</span>
              <span />
            </div>
            {lines.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                No line items yet. Add one to start building the estimate.
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
              <Button variant="outline" size="sm" onClick={addLine}>
                <Plus className="size-4" />
                Add line
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <span className="flex items-center gap-1 text-sm font-medium">
              Notes <HelpHint text={helpText.notes} />
            </span>
            <Textarea
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                setDirty(true);
              }}
              placeholder="Internal notes (not shown to the client)…"
            />
          </div>
        </div>

        {/* Right: totals */}
        <div className="h-fit space-y-5 rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">Subtotal</span>
            <span className="tabular-nums">{formatCents(totals.subtotalCents)}</span>
          </div>

          <div className="space-y-2">
            <span className="flex items-center gap-1 text-sm font-medium">
              Discount <HelpHint text={helpText.orderDiscount} />
            </span>
            <div className="flex gap-2">
              <select
                className={`${selectClass} w-24`}
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
                  className="flex-1"
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
                  className="w-full"
                  valueCents={orderDiscountValue}
                  onChangeCents={(cents) => {
                    setOrderDiscountValue(cents);
                    setDirty(true);
                  }}
                />
              )}
            </div>
            {totals.discountCents > 0 && (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Discount applied</span>
                <span className="tabular-nums">−{formatCents(totals.discountCents)}</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <span className="flex items-center gap-1 text-sm font-medium">
              Tax rate (%) <HelpHint text={helpText.taxRate} />
            </span>
            <Input
              type="number"
              min={0}
              max={100}
              placeholder="0"
              value={taxRatePercent || ""}
              onChange={(e) => {
                setTaxRatePercent(Number(e.target.value));
                setDirty(true);
              }}
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Tax</span>
              <span className="tabular-nums">{formatCents(totals.taxCents)}</span>
            </div>
          </div>

          <div className="flex items-baseline justify-between border-t pt-4">
            <span className="text-base font-semibold text-primary">Total</span>
            <span
              data-testid="grand-total"
              className="text-lg font-semibold text-primary tabular-nums"
            >
              {formatCents(totals.totalCents)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
