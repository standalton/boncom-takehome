/**
 * validation.ts — shared Zod schemas for quote input.
 *
 * What:        The single definition of what a valid line item and quote look
 *              like (no >100% discounts, non-negative money, required fields).
 * Where used:  The UI (inline form validation) AND the server actions
 *              (authoritative re-validation — the client is never trusted).
 *              The database adds CHECK constraints as a final backstop.
 * Notes:       Defined once, enforced in three layers. Keep in sync with the
 *              DB constraints in supabase/migrations.
 */

import { z } from "zod";

const discountType = z.enum(["none", "percent", "fixed"]);

const percentNotOver100 = (data: { discountType: z.infer<typeof discountType>; discountValue: number }) =>
  data.discountType !== "percent" || data.discountValue <= 100;

export const lineItemSchema = z
  .object({
    description: z.string().min(1, "Description is required"),
    quantity: z.number().positive("Quantity must be greater than 0"),
    rateCents: z.number().int().min(0, "Rate cannot be negative"),
    discountType,
    discountValue: z.number().min(0, "Discount cannot be negative"),
    // Optional link to the catalog product a line was filled from (audit only).
    productId: z.string().nullable().optional(),
  })
  .refine(percentNotOver100, {
    message: "Percentage discount cannot exceed 100%",
    path: ["discountValue"],
  })
  .refine(
    (li) => li.discountType !== "fixed" || li.discountValue <= Math.round(li.quantity * li.rateCents),
    { message: "Fixed discount cannot exceed the line total", path: ["discountValue"] },
  );

// Note: an order-level fixed discount larger than the subtotal cannot be
// validated here (the subtotal isn't known at schema time); the pricing layer
// clamps it so the total never goes negative.
export const quoteSchema = z
  .object({
    clientId: z.string().min(1, "A client is required"),
    taxRatePercent: z.number().min(0).max(100, "Tax rate must be between 0 and 100"),
    orderDiscountType: discountType,
    orderDiscountValue: z.number().min(0),
    lineItems: z.array(lineItemSchema),
    notes: z.string().optional().default(""),
    validUntil: z.string().optional().default(""),
  })
  .refine(
    (q) => q.orderDiscountType !== "percent" || q.orderDiscountValue <= 100,
    { message: "Percentage discount cannot exceed 100%", path: ["orderDiscountValue"] },
  );

export type QuoteInput = z.infer<typeof quoteSchema>;
export type LineItemInput = z.infer<typeof lineItemSchema>;
