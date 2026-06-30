/**
 * help-text.ts — central dictionary of in-app help copy.
 *
 * What:        Every "what is this?" tooltip string in one place, so wording
 *              stays consistent and is easy to review or revise.
 * Where used:  Passed to the HelpHint component throughout the UI.
 */
export const helpText = {
  client: "Who this quote is for. Pick an existing client or add a new one.",
  status:
    "Where this quote sits in your pipeline: Draft, Sent, Accepted, Paid, or Declined.",
  lineItem: "A single product or service: a description, a quantity, and a rate.",
  lineDiscount: "An optional discount applied to just this line item.",
  orderDiscount: "A discount applied to the whole quote, after line items.",
  taxRate: "The tax percentage, applied to the subtotal after discounts.",
  validUntil: "The date this quote expires.",
  notes: "Internal notes about this quote. Not shown to the client.",
} as const;

export type HelpKey = keyof typeof helpText;
