/**
 * LineItemRow.tsx — one editable line item (stacked layout).
 *
 * What:        Description on its own line, then a compact meta row with Qty,
 *              Rate, an optional per-line discount, and the line total.
 * Where used:  The quote editor's line-items list.
 * Notes:       Stacked (not a rigid column grid) so it stays clean and readable
 *              at any width — it can't be crushed on narrow screens. Inputs keep
 *              a visible resting border so it's always clear they're editable.
 */
"use client";

import { Trash2, X } from "lucide-react";
import { formatCents } from "@/lib/money";
import type { DiscountType } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MoneyInput } from "@/components/MoneyInput";
import { NumberInput } from "@/components/NumberInput";
import { ProductPicker } from "@/components/ProductPicker";
import type { ProductOption } from "@/lib/product-option";

export type LineItemPatch = Partial<{
  description: string;
  quantity: number;
  rateCents: number;
  discountType: DiscountType;
  discountValue: number;
  productId: string | null;
}>;

type Props = {
  description: string;
  quantity: number;
  rateCents: number;
  discountType: DiscountType;
  discountValue: number;
  lineNetCents: number;
  products: ProductOption[];
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
  products,
  onChange,
  onRemove,
}: Props) {
  const hasDiscount = discountType !== "none";

  return (
    <div className="group/row border-b px-4 py-3 transition-colors last:border-b-0 hover:bg-muted/20">
      <div className="flex items-center gap-2">
        {products.length > 0 && (
          <ProductPicker
            products={products}
            // Picking a product fills the line; a blank description takes the
            // product name, but a description you've already typed is kept.
            // productId records that this came from the catalog (for history).
            onSelect={(p) =>
              onChange({
                description: description.trim() ? description : p.name,
                rateCents: p.rateCents,
                productId: p.id,
              })
            }
          />
        )}
        <Input
          placeholder="Add a description…"
          className="h-9 flex-1 text-[15px] font-medium placeholder:font-normal placeholder:text-muted-foreground/60"
          value={description}
          onChange={(e) => onChange({ description: e.target.value })}
        />
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Remove line"
          className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover/row:opacity-100"
          onClick={onRemove}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-2 pl-0.5">
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          Qty
          <NumberInput
            aria-label="Quantity"
            className="h-8 w-16 px-1 text-center text-sm"
            value={quantity}
            placeholder="1"
            onChangeNumber={(n) => onChange({ quantity: n })}
          />
        </label>

        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          Rate
          <MoneyInput
            aria-label="Rate"
            className="h-8 w-28 text-sm"
            valueCents={rateCents}
            onChangeCents={(cents) => onChange({ rateCents: cents })}
          />
        </label>

        {!hasDiscount ? (
          <button
            type="button"
            className="inline-flex h-8 items-center rounded-md border border-dashed border-input px-3 text-xs text-muted-foreground transition-colors hover:border-ring hover:text-foreground"
            onClick={() => onChange({ discountType: "percent", discountValue: 0 })}
          >
            + Discount
          </button>
        ) : (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            Disc
            <select
              className="h-8 rounded-md border border-input bg-transparent px-1.5 text-xs outline-none transition-colors focus-visible:border-ring"
              value={discountType}
              onChange={(e) => onChange({ discountType: e.target.value as DiscountType, discountValue: 0 })}
            >
              <option value="percent">%</option>
              <option value="fixed">$</option>
            </select>
            {discountType === "percent" ? (
              <NumberInput
                aria-label="Line discount percent"
                className="h-8 w-16 text-sm"
                value={discountValue}
                placeholder="0"
                onChangeNumber={(n) => onChange({ discountValue: n })}
              />
            ) : (
              <MoneyInput
                className="h-8 w-24 text-sm"
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
          </span>
        )}

        <span className="ml-auto text-sm font-semibold tabular-nums">
          {formatCents(lineNetCents)}
        </span>
      </div>
    </div>
  );
}
