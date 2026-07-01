/**
 * use-synced-text.ts — local editable text that re-seeds on external changes.
 *
 * What:        Backs a text input with local string state (so partial input
 *              like "19." types smoothly) while re-seeding from an external
 *              value when the parent changes it — but not on the input's own
 *              echo, so in-progress typing is never clobbered.
 * Where used:  MoneyInput (cents) and NumberInput (number) in the quote editor.
 * Notes:       Re-seeds during render, not in an effect, to avoid a cascading
 *              rerender (same idiom as NewClientDialog's open-transition seed).
 *              `parse` must invert `toText` for values the field can produce, so
 *              an echoed change reads as "already shown" and typing is left be.
 */
"use client";

import { useState } from "react";

export function useSyncedText<T>(
  external: T,
  toText: (value: T) => string,
  parse: (text: string) => T,
): [string, (text: string) => void] {
  const [text, setText] = useState(() => toText(external));
  const [synced, setSynced] = useState(external);
  if (external !== synced) {
    setSynced(external);
    if (parse(text) !== external) setText(toText(external));
  }
  return [text, setText];
}
