/**
 * MoneyInput.tsx — currency input bound to integer cents.
 *
 * What:        Shows a dollar amount with a "$" affix; reports changes as
 *              integer cents via onChangeCents.
 * Where used:  Line item rates and fixed-dollar discounts in the quote editor.
 * Notes:       Holds a local text string so partial input (e.g. "19.") types
 *              smoothly; entry is capped at two decimals (integer cents), and
 *              parsing/validation of the cents value happens upstream.
 */
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { dollarsToCents } from "@/lib/money";
import { selectAllOnFocus, sanitizeDecimalInput } from "@/lib/field-helpers";
import { cn } from "@/lib/utils";

type MoneyInputProps = {
  valueCents: number;
  onChangeCents: (cents: number) => void;
  className?: string;
  // When set, the field renders in its invalid (red) state. The message text is
  // rendered by the parent, next to the field.
  error?: string;
  // Id of the parent-rendered error message, linked via aria-describedby so a
  // screen reader reads the reason, not just "invalid".
  errorId?: string;
} & Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "type">;

export function MoneyInput({ valueCents, onChangeCents, className, error, errorId, ...props }: MoneyInputProps) {
  const [text, setText] = useState(valueCents ? (valueCents / 100).toString() : "");
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-muted-foreground">
        $
      </span>
      <Input
        inputMode="decimal"
        className={cn("pl-6", className)}
        value={text}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...selectAllOnFocus}
        onChange={(e) => {
          // Dollars are stored as integer cents, so cap entry at two decimals.
          const cleaned = sanitizeDecimalInput(e.target.value, 2);
          setText(cleaned);
          onChangeCents(dollarsToCents(cleaned));
        }}
        {...props}
      />
    </div>
  );
}
