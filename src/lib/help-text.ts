/**
 * help-text.ts — central dictionary of in-app help copy.
 *
 * What:        Every "what is this?" tooltip string in one place, so wording
 *              stays consistent and is easy to review or revise.
 * Where used:  Passed to the HelpHint component throughout the UI.
 */
export const helpText = {
  quoteNumber: "A unique reference automatically generated when the quote is created.",
  client: "Who this quote is for. Pick an existing client or add a new one.",
  status:
    "Where this quote sits in its lifecycle: Draft → Finalized → Sent → Accepted, Paid, or Declined. Accepted/Paid/Declined unlock once the quote has been sent.",
  finalize:
    "Lock in this quote's details so it's ready to share. Finalizing lets you export it and then send it to the client.",
  lineItem: "A single product or service: a description, a quantity, and a rate.",
  lineDiscount: "An optional discount applied to just this line item.",
  orderDiscount: "A discount applied to the whole quote, after line items.",
  taxRate: "The tax percentage, applied to the subtotal after discounts.",
  validUntil: "The date this quote expires.",
  notes: "Internal notes about this quote. Not shown to the client.",

  // Dashboard sections
  dashOpenPipeline:
    "Total value of quotes that are finalized or sent — deals still in play, awaiting a decision.",
  dashWon: "Total value of accepted or paid quotes, with your win rate (won ÷ decided).",
  dashAwaiting: "How many quotes you've sent that are still awaiting a client response.",
  dashDrafts: "Quotes still being worked on and not yet finalized.",
  dashPipeline: "A count of quotes at each stage of the lifecycle.",
  dashRecentQuotes: "Your ten most recently updated quotes.",
} as const;

export type HelpKey = keyof typeof helpText;
