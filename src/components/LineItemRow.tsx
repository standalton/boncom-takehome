/**
 * LineItemRow.tsx — one editable line item.
 *
 * What:        Description, quantity, rate, an optional per-line discount
 *              (revealed on demand), the computed line total, and a remove
 *              button that appears on row hover.
 * Where used:  The quote editor's line-items list.
 * Notes:       Inputs are "ghost" (clean at rest, reveal on hover/focus) for a
 *              document-like feel. The column grid is shared with the editor
 *              header via LINE_GRID (inline style, so it can't be lost to CSS
 *              caching).
 */
"use client";

import { Trash2, X } from "lucide-react";
import { formatCents } from "@/lib/money";
import type { DiscountType } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MoneyInput } from "@/components/MoneyInput";

export const LINE_GRID = "minmax(0,1fr) 4rem 8.5rem 6.5rem 2.25rem";

const ghost = "border-transparent bg-transparent shadow-none hover:bg-muted/60";

export type LineItemPatch = Partial<{
  description: string;
  quantity: number;
  rateCents: number;
  discountType: DiscountType;
  discountValue: number;
}>;

type Props = {
  description: string;
  quantity: number;
  rateCents: number;
  discountType: DiscountType;
  discountValue: number;
  lineNetCents: number;
  onChange: (patch: LineItemPatch) => void;
  onRemove: () => void;
};

export function LineItemRow({
  description,
  quantity,
  rateCents,
  discountType,
  discountValue,
  lineNetCents,
  onChange,
  onRemove,
}: Props) {
  const hasDiscount = discountType !== "none";

  return (
    <div className="group/row border-b px-4 py-2 transition-colors last:border-b-0 hover:bg-muted/20">
      <div className="grid items-center gap-3" style={{ gridTemplateColumns: LINE_GRID }}>
        <Input
          placeholder="Description"
          className={`min-w-0 ${ghost}`}
          value={description}
          onChange={(e) => onChange({ description: e.target.value })}
        />
        <Input
          type="number"
          min={0}
          step="0.5"
          aria-label="Quantity"
          className={`px-1 text-center ${ghost}`}
          value={quantity || ""}
          placeholder="1"
          onChange={(e) => onChange({ quantity: Number(e.target.value) })}
        />
        <MoneyInput
          aria-label="Rate"
          className={ghost}
          valueCents={rateCents}
          onChangeCents={(cents) => onChange({ rateCents: cents })}
        />
        <span className="truncate text-right text-sm font-semibold text-foreground tabular-nums">
          {formatCents(lineNetCents)}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Remove line"
          className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover/row:opacity-100"
          onClick={onRemove}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>

      <div className="mt-0.5 flex h-6 items-center gap-2 pl-1 text-xs">
        {!hasDiscount ? (
          <button
            type="button"
            className="text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover/row:opacity-100"
            onClick={() => onChange({ discountType: "percent", discountValue: 0 })}
          >
            + Add line discount
          </button>
        ) : (
          <>
            <span className="text-muted-foreground">Discount</span>
            <select
              className="h-6 rounded-md border border-input bg-transparent px-1.5 text-xs outline-none transition-colors focus-visible:border-ring"
              value={discountType}
              onChange={(e) => onChange({ discountType: e.target.value as DiscountType, discountValue: 0 })}
            >
              <option value="percent">%</option>
              <option value="fixed">$</option>
            </select>
            {discountType === "percent" ? (
              <Input
                type="number"
                min={0}
                max={100}
                aria-label="Line discount percent"
                className="h-6 w-16"
                value={discountValue || ""}
                placeholder="0"
                onChange={(e) => onChange({ discountValue: Number(e.target.value) })}
              />
            ) : (
              <MoneyInput
                className="h-6 w-24"
                aria-label="Line discount amount"
                valueCents={discountValue}
                onChangeCents={(cents) => onChange({ discountValue: cents })}
              />
            )}
            <button
              type="button"
              aria-label="Remove discount"
              className="text-muted-foreground transition-colors hover:text-destructive"
              onClick={() => onChange({ discountType: "none", discountValue: 0 })}
            >
              <X className="size-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
