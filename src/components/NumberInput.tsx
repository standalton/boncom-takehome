/**
 * NumberInput.tsx — text input that reports a parsed number.
 *
 * What:        Keeps a local text string so partial input ("1.") types smoothly
 *              and selects its contents on focus so a value can be typed over.
 *              Reports the parsed number via onChangeNumber.
 * Where used:  Quantity, percentage discounts, and tax rate in the quote editor.
 * Notes:       Uses type="text" + inputMode (not type="number") so selection
 *              works; input is sanitized to digits and a single decimal point.
 *              Range is enforced upstream (Zod on save, pricing clamps live).
 */
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { selectAllOnFocus } from "@/lib/field-helpers";

type NumberInputProps = {
  value: number;
  onChangeNumber: (n: number) => void;
} & Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "type">;

export function NumberInput({ value, onChangeNumber, ...props }: NumberInputProps) {
  const [text, setText] = useState(value ? String(value) : "");
  return (
    <Input
      inputMode="decimal"
      value={text}
      {...selectAllOnFocus}
      onChange={(e) => {
        // Allow only digits and one decimal point.
        const cleaned = e.target.value.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1");
        setText(cleaned);
        const n = Number(cleaned);
        onChangeNumber(Number.isNaN(n) ? 0 : n);
      }}
      {...props}
    />
  );
}
