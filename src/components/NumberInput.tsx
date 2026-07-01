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

import { Input } from "@/components/ui/input";
import { selectAllOnFocus, sanitizeDecimalInput } from "@/lib/field-helpers";
import { useSyncedText } from "@/lib/use-synced-text";

type NumberInputProps = {
  value: number;
  onChangeNumber: (n: number) => void;
  // When set, the field renders in its invalid (red) state. The message text is
  // rendered by the parent, next to the field.
  error?: string;
  // Id of the parent-rendered error message, linked via aria-describedby so a
  // screen reader reads the reason, not just "invalid".
  errorId?: string;
} & Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "type">;

const numberToText = (n: number) => (n ? String(n) : "");
const parseNumber = (t: string) => {
  const n = Number(t);
  return Number.isNaN(n) ? 0 : n;
};

export function NumberInput({ value, onChangeNumber, error, errorId, ...props }: NumberInputProps) {
  // Re-seeds from value when the parent changes it, but leaves in-progress input
  // like "2." alone.
  const [text, setText] = useSyncedText(value, numberToText, parseNumber);
  return (
    <Input
      inputMode="decimal"
      value={text}
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? errorId : undefined}
      {...selectAllOnFocus}
      onChange={(e) => {
        // Allow only digits and one decimal point (quantities/percentages are
        // not capped to two places — that's a money-only rule).
        const cleaned = sanitizeDecimalInput(e.target.value);
        setText(cleaned);
        onChangeNumber(parseNumber(cleaned));
      }}
      {...props}
    />
  );
}
