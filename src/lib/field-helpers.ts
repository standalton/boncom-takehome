/**
 * field-helpers.ts — small reusable input behaviors.
 *
 * What:        `selectAllOnFocus` selects an input's contents when it gains
 *              focus, so a value can be typed over without backspacing.
 * Where used:  Numeric/money inputs in the quote editor (quantity, rate,
 *              discounts, tax rate).
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
