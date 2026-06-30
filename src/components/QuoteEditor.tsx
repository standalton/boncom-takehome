/**
 * QuoteEditor.tsx — the core estimate editor.
 *
 * What:        Edit a quote's client, line items (each with an optional
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
const statusDot: Record<QuoteStatus, string> = {
  draft: "#9ca3af",
  sent: "#3b82f6",
  accepted: "#22c55e",
  paid: "#10b981",
  declined: "#ef4444",
};

const eyebrow =
  "flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground";
const fieldSelect =
  "h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none transition-colors hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40";

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
    <>
      <div className="px-8 pt-8 pb-32">
        {/* Header */}
        <div className="mx-auto mb-8 flex max-w-3xl flex-wrap items-start justify-between gap-4 border-b pb-5">
          <div>
            <div className={eyebrow}>Estimate</div>
            <div className="mt-1.5 flex items-center gap-3">
              <h1 className="text-3xl font-light tracking-tight text-primary">{props.number}</h1>
              {dirty && (
                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
                  Unsaved
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <HelpHint text={helpText.status} />
            <span className="inline-flex items-center gap-2 rounded-lg border px-3 py-2">
              <span className="size-2 rounded-full" style={{ background: statusDot[status] }} aria-hidden />
              <select
                aria-label="Status"
                className="bg-transparent text-sm outline-none"
                value={status}
                onChange={(e) => changeStatus(e.target.value as QuoteStatus)}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s[0].toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="mx-auto max-w-3xl space-y-8">
          <div className="space-y-2">
            <label className={eyebrow}>
              Client <HelpHint text={helpText.client} />
            </label>
            <select
              className={fieldSelect}
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

          {/* Line items */}
          <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
            <div className="border-b bg-muted/30 px-4 py-2.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Line items
              </span>
            </div>
            {lines.length === 0 ? (
              <div className="px-4 py-12 text-center text-sm text-muted-foreground">
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
