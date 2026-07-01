/**
 * QuoteEditorForm.tsx — the editable body of a draft quote.
 *
 * What:        Client picker, the line-items list (+ add line), the discount &
 *              tax card, and internal notes. Purely the editing surface; all
 *              state and persistence live in QuoteEditor.
 * Where used:  QuoteEditor renders this while a quote is a draft (a finalized
 *              quote shows QuoteInvoiceView instead).
 */
"use client";

import { Plus } from "lucide-react";
import { helpText } from "@/lib/help-text";
import type { Client, DiscountType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { HelpHint } from "@/components/HelpHint";
import { LineItemRow, type LineItemPatch } from "@/components/LineItemRow";
import { AdjustmentsCard } from "@/components/AdjustmentsCard";
import { ClientPicker } from "@/components/ClientPicker";
import type { ClientOption } from "@/lib/client-option";
import type { ProductOption } from "@/lib/product-option";

const eyebrow =
  "flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground";

export type EditorLine = {
  key: string;
  description: string;
  quantity: number;
  rateCents: number;
  discountType: DiscountType;
  discountValue: number;
  productId: string | null;
};

type Props = {
  clients: ClientOption[];
  clientId: string;
  onClientChange: (id: string) => void;
  onClientAdded: (client: Client) => void;
  products: ProductOption[];
  lines: EditorLine[];
  lineNets: number[];
  onUpdateLine: (key: string, patch: LineItemPatch) => void;
  onAddLine: () => void;
  onRemoveLine: (key: string) => void;
  discountType: DiscountType;
  discountValue: number;
  taxRatePercent: number;
  discountCents: number;
  taxCents: number;
  onDiscountChange: (type: DiscountType, value: number) => void;
  onTaxChange: (value: number) => void;
  notes: string;
  onNotesChange: (value: string) => void;
};

export function QuoteEditorForm({
  clients,
  clientId,
  onClientChange,
  onClientAdded,
  products,
  lines,
  lineNets,
  onUpdateLine,
  onAddLine,
  onRemoveLine,
  discountType,
  discountValue,
  taxRatePercent,
  discountCents,
  taxCents,
  onDiscountChange,
  onTaxChange,
  notes,
  onNotesChange,
}: Props) {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="space-y-2">
        <label className={eyebrow}>
          Client <HelpHint text={helpText.client} />
        </label>
        <ClientPicker
          clients={clients}
          value={clientId}
          onChange={onClientChange}
          onClientAdded={onClientAdded}
        />
      </div>

      <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="border-b bg-muted/30 px-4 py-2.5">
          <span className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
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
              lineNetCents={lineNets[i] ?? 0}
              products={products}
              onChange={(patch) => onUpdateLine(l.key, patch)}
              onRemove={() => onRemoveLine(l.key)}
            />
          ))
        )}
        <div className="p-3">
          <Button
            variant="ghost"
            onClick={onAddLine}
            className="w-full justify-center border border-dashed text-muted-foreground hover:text-foreground"
          >
            <Plus className="size-4" />
            Add line
          </Button>
        </div>
      </section>

      <AdjustmentsCard
        discountType={discountType}
        discountValue={discountValue}
        taxRatePercent={taxRatePercent}
        discountCents={discountCents}
        taxCents={taxCents}
        onDiscountChange={onDiscountChange}
        onTaxChange={onTaxChange}
      />

      <div className="space-y-2">
        <label className={eyebrow}>
          Notes <HelpHint text={helpText.notes} />
        </label>
        <Textarea
          className="min-h-24 rounded-lg"
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Internal notes (not shown to the client)…"
        />
      </div>
    </div>
  );
}
