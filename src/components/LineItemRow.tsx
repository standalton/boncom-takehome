/**
 * LineItemRow.tsx — one editable line item.
 *
 * What:        Description, quantity, rate, an optional per-line discount
 *              (revealed on demand), the computed line total, and a remove
 *              button.
 * Where used:  The quote editor's line-items list.
 * Notes:       The discount control appears only once "Add discount" is clicked
 *              (or a discount already exists), keeping simple rows clean.
 */
"use client";

import { Trash2, X } from "lucide-react";
import { formatCents } from "@/lib/money";
import type { DiscountType } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MoneyInput } from "@/components/MoneyInput";

const selectClass =
  "h-9 rounded-md border border-input bg-transparent px-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

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
    <div className="border-b px-4 py-3 transition-colors last:border-b-0 hover:bg-muted/30">
      <div className="flex items-center gap-3">
        <Input
          placeholder="Description"
          className="flex-1"
          value={description}
          onChange={(e) => onChange({ description: e.target.value })}
        />
        <Input
          type="number"
          min={0}
          step="0.5"
          aria-label="Quantity"
          className="w-16 text-center"
          value={quantity || ""}
          placeholder="1"
          onChange={(e) => onChange({ quantity: Number(e.target.value) })}
        />
        <MoneyInput
          className="w-28"
          aria-label="Rate"
          valueCents={rateCents}
          onChangeCents={(cents) => onChange({ rateCents: cents })}
        />
        <span className="w-24 text-right text-sm font-medium tabular-nums">
          {formatCents(lineNetCents)}
        </span>
        <Button variant="ghost" size="icon-sm" aria-label="Remove line" onClick={onRemove}>
          <Trash2 className="size-4" />
        </Button>
      </div>

      <div className="mt-2 flex items-center gap-2 pl-1 text-xs">
        {!hasDiscount ? (
          <button
            type="button"
            className="text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => onChange({ discountType: "percent", discountValue: 0 })}
          >
            + Add line discount
          </button>
        ) : (
          <>
            <span className="text-muted-foreground">Discount</span>
            <select
              className={`${selectClass} h-7`}
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
                className="h-7 w-20"
                value={discountValue || ""}
                placeholder="0"
                onChange={(e) => onChange({ discountValue: Number(e.target.value) })}
              />
            ) : (
              <MoneyInput
                className="h-7 w-24"
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
