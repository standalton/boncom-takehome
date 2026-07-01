/**
 * AdjustmentsCard.tsx — order-level discount and tax controls.
 *
 * What:        A two-column card: Discount (type + value) and Tax rate, each
 *              with its live computed amount shown beneath.
 * Where used:  The quote editor, below the line items.
 * Notes:       Presentation + input only — the authoritative maths live in
 *              lib/pricing (computeTotals), whose results come back in as
 *              discountCents / taxCents for the amount text.
 */
"use client";

import { formatCents } from "@/lib/money";
import { helpText } from "@/lib/help-text";
import type { DiscountType } from "@/lib/types";
import { HelpHint } from "@/components/HelpHint";
import { NumberInput } from "@/components/NumberInput";
import { MoneyInput } from "@/components/MoneyInput";

const eyebrow =
  "flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground";

type Props = {
  discountType: DiscountType;
  discountValue: number;
  taxRatePercent: number;
  discountCents: number;
  taxCents: number;
  onDiscountChange: (type: DiscountType, value: number) => void;
  onTaxChange: (value: number) => void;
};

export function AdjustmentsCard({
  discountType,
  discountValue,
  taxRatePercent,
  discountCents,
  taxCents,
  onDiscountChange,
  onTaxChange,
}: Props) {
  return (
    <section className="grid gap-5 rounded-2xl border bg-card p-5 shadow-sm sm:grid-cols-2">
      <div className="space-y-2">
        <label className={eyebrow}>
          Discount <HelpHint text={helpText.orderDiscount} />
        </label>
        <div className="flex gap-2">
          <select
            aria-label="Discount type"
            className="h-10 w-28 rounded-lg border border-input bg-transparent px-2 text-sm outline-none transition-colors hover:bg-muted/40 focus-visible:border-ring"
            value={discountType}
            onChange={(e) => onDiscountChange(e.target.value as DiscountType, 0)}
          >
            <option value="none">None</option>
            <option value="percent">Percent</option>
            <option value="fixed">Amount</option>
          </select>
          {discountType === "percent" && (
            <NumberInput
              aria-label="Discount percent"
              className="h-10 flex-1"
              placeholder="0"
              value={discountValue}
              onChangeNumber={(n) => onDiscountChange("percent", n)}
            />
          )}
          {discountType === "fixed" && (
            <MoneyInput
              aria-label="Discount amount"
              className="h-10 w-full"
              valueCents={discountValue}
              onChangeCents={(cents) => onDiscountChange("fixed", cents)}
            />
          )}
        </div>
        {discountCents > 0 && (
          <p className="text-xs tabular-nums text-muted-foreground">
            −{formatCents(discountCents)} applied
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label className={eyebrow}>
          Tax rate (%) <HelpHint text={helpText.taxRate} />
        </label>
        <NumberInput
          aria-label="Tax rate percent"
          className="h-10"
          placeholder="0"
          value={taxRatePercent}
          onChangeNumber={onTaxChange}
        />
        <p className="text-xs tabular-nums text-muted-foreground">{formatCents(taxCents)} tax</p>
      </div>
    </section>
  );
}
