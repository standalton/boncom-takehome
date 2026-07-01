/**
 * use-quote-validation.ts — live, per-field validation state for the editor.
 *
 * What:        Runs collectQuoteErrors on the current draft each render and
 *              tracks which fields have been blurred, so errors surface with
 *              "reward early, punish late" timing. Also drives reveal-on-save:
 *              mark everything touched and scroll to the first invalid field.
 * Where used:  use-quote-editor.
 * Notes:       Interaction/presentation state only — the rules themselves live
 *              in lib/quote-errors (schema mapping) and the server. Split out of
 *              use-quote-editor to keep that hook focused on state + persistence.
 */
"use client";

import { useMemo, useState } from "react";
import { collectQuoteErrors, hasAnyError, type FieldErrors, type LineFieldErrors } from "@/lib/quote-errors";
import type { DiscountType } from "@/lib/types";
import type { EditorLine } from "@/components/QuoteEditorForm";

type ValidationInput = {
  clientId: string;
  taxRatePercent: number;
  orderDiscountType: DiscountType;
  orderDiscountValue: number;
  notes: string;
  validUntil: string;
  lines: EditorLine[];
  subtotalCents: number;
};

export function useQuoteValidation(input: ValidationInput) {
  const { clientId, taxRatePercent, orderDiscountType, orderDiscountValue, notes, validUntil, lines, subtotalCents } =
    input;

  const errors = useMemo<FieldErrors>(
    () =>
      collectQuoteErrors(
        {
          clientId,
          taxRatePercent,
          orderDiscountType,
          orderDiscountValue,
          notes,
          validUntil,
          lineItems: lines.map((l) => ({
            description: l.description,
            quantity: l.quantity,
            rateCents: l.rateCents,
            discountType: l.discountType,
            discountValue: l.discountValue,
            productId: l.productId,
          })),
        },
        lines.map((l) => l.key),
        subtotalCents,
      ),
    [clientId, taxRatePercent, orderDiscountType, orderDiscountValue, notes, validUntil, lines, subtotalCents],
  );

  // "Reward early, punish late": a field only shows its error once it's been
  // blurred (added to `touched`); after that it re-validates live as it's fixed.
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const markTouched = (id: string) =>
    setTouched((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));

  // Drop a removed line's touched flags so the set doesn't accrue dead keys.
  const forgetLine = (key: string) =>
    setTouched((prev) => {
      let changed = false;
      const next = new Set(prev);
      for (const id of prev) {
        if (id.startsWith(`${key}:`)) {
          next.delete(id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });

  // Error for a top-level field, gated by touched.
  const fieldError = (id: "clientId" | "taxRatePercent" | "orderDiscount") =>
    touched.has(id) ? errors[id] : undefined;

  // Per-line errors, each gated by its own touched flag (`<lineKey>:<field>`).
  const lineErrors = (key: string): LineFieldErrors => {
    const all = errors.lines[key];
    if (!all) return {};
    const out: LineFieldErrors = {};
    for (const field of Object.keys(all) as (keyof LineFieldErrors)[]) {
      if (touched.has(`${key}:${field}`)) out[field] = all[field];
    }
    return out;
  };

  // On a save attempt with outstanding errors: reveal every invalid field (so
  // untouched ones light up too) and scroll to the first, instead of failing
  // silently. The server stays the authoritative backstop.
  const revealErrors = () => {
    const ids: string[] = [];
    if (errors.clientId) ids.push("clientId");
    if (errors.taxRatePercent) ids.push("taxRatePercent");
    if (errors.orderDiscount) ids.push("orderDiscount");
    for (const [key, line] of Object.entries(errors.lines)) {
      for (const field of Object.keys(line)) ids.push(`${key}:${field}`);
    }
    setTouched((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>('[aria-invalid="true"]');
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
      el?.focus();
    });
  };

  return {
    errors,
    hasErrors: hasAnyError(errors),
    fieldError,
    lineErrors,
    markTouched,
    forgetLine,
    revealErrors,
  };
}
