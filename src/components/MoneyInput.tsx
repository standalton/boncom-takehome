/**
 * MoneyInput.tsx — currency input bound to integer cents.
 *
 * What:        Shows a dollar amount with a "$" affix; reports changes as
 *              integer cents via onChangeCents.
 * Where used:  Line item rates and fixed-dollar discounts in the quote editor.
 * Notes:       Holds a local text string so partial input (e.g. "19.") types
 *              smoothly; parsing/validation of the cents value happens upstream.
 */
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { dollarsToCents } from "@/lib/money";
import { cn } from "@/lib/utils";

type MoneyInputProps = {
  valueCents: number;
  onChangeCents: (cents: number) => void;
  className?: string;
} & Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "type">;

export function MoneyInput({ valueCents, onChangeCents, className, ...props }: MoneyInputProps) {
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
        // Select the value on focus so it can be typed over without backspacing.
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => {
          setText(e.target.value);
          onChangeCents(dollarsToCents(e.target.value));
        }}
        {...props}
      />
    </div>
  );
}
