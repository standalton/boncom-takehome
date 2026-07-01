/**
 * field-helpers.ts — small reusable input behaviors.
 *
 * What:        `selectAllOnFocus` selects an input's contents when it gains
 *              focus, so a value can be typed over without backspacing.
 *              `sanitizeDecimalInput` strips non-numeric characters and,
 *              optionally, caps the number of decimal places as the user types.
 *              `formatPhoneInput` masks free-typed text into the one allowed
 *              US phone shape `(123) 456-7890`; `PHONE_PATTERN` / `isCompletePhone`
 *              are the matching completeness check reused by server validation.
 * Where used:  Numeric/money inputs in the quote editor (quantity, rate,
 *              discounts, tax rate); the phone field in NewClientDialog.
 * Notes:       The mouseup guard is essential — focus fires before the click's
 *              mouseup, which would otherwise collapse the selection to a caret.
 *              Spread it onto an input: `<input {...selectAllOnFocus} />`. Only
 *              works on text-like inputs (use type="text" + inputMode, not
 *              type="number", which doesn't support selection).
 */
import type { FocusEvent, MouseEvent } from "react";

export const selectAllOnFocus = {
  onFocus: (e: FocusEvent<HTMLInputElement>) => e.currentTarget.select(),
  onMouseUp: (e: MouseEvent<HTMLInputElement>) => e.preventDefault(),
};

/**
 * Clean free-typed numeric text: keep digits and a single decimal point, and
 * (when `maxDecimals` is given) keep at most that many digits after the point.
 * Returns a string, not a number, so partial input like "1." or "19.9" keeps
 * typing smoothly. Dollar amounts pass `maxDecimals: 2` to stop sub-cent input.
 */
export function sanitizeDecimalInput(value: string, maxDecimals?: number): string {
  // Allow only digits and one decimal point (drop any point after the first).
  let cleaned = value.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1");
  if (maxDecimals !== undefined) {
    const dot = cleaned.indexOf(".");
    if (dot !== -1) {
      cleaned = cleaned.slice(0, dot + 1) + cleaned.slice(dot + 1, dot + 1 + maxDecimals);
    }
  }
  return cleaned;
}

/** The one canonical shape a saved phone number may take: `(123) 456-7890`. */
export const PHONE_PATTERN = /^\(\d{3}\) \d{3}-\d{4}$/;

/** Longest string `formatPhoneInput` can return — use as the input's maxLength. */
export const PHONE_MAX_LENGTH = "(123) 456-7890".length;

/**
 * Progressively mask free-typed input into US phone format `(123) 456-7890`.
 * Keeps only digits (max 10) and lays the punctuation down as the user types,
 * so the field can never hold a differently-formatted value — separators the
 * user types or pastes are ignored and re-derived. Reformatting from the
 * extracted digits (rather than editing the string in place) makes deletion
 * behave naturally: trailing separators only appear ahead of real digits.
 */
export function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length === 0) return "";
  if (digits.length < 4) return `(${digits}`;
  if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/** True when `value` is a complete, correctly-formatted phone number. */
export function isCompletePhone(value: string): boolean {
  return PHONE_PATTERN.test(value);
}
