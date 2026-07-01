/**
 * quote-status.ts — the quote lifecycle state machine.
 *
 * What:        The single source of truth for which quote statuses are editable
 *              and which status transitions are allowed. Pure functions, no I/O.
 * Where used:  actions/quotes.ts enforces these server-side; the editor UI
 *              (use-quote-editor, StatusSelect) drives the same transitions.
 * Notes:       Keep this aligned with the UI. A transition the UI offers but the
 *              server rejects is a bug (the action would fail); a transition the
 *              server allows but the UI never offers is only reachable by a direct
 *              call, which is exactly what these guards are meant to police.
 */
import type { QuoteStatus } from "@/lib/types";

// Only a draft can be edited. Once finalized/sent the quote is a locked record;
// editing requires reverting to draft first (finalized -> draft).
export const EDITABLE_STATUSES: QuoteStatus[] = ["draft"];

export function isEditableStatus(status: QuoteStatus): boolean {
  return EDITABLE_STATUSES.includes(status);
}

// Forward transitions: from a status, the statuses it may move to.
// - draft -> finalized (Finalize)
// - finalized -> draft (Edit / revert) or sent (Send)
// - sent + post-send states move freely among themselves; "sent" self-loops to
//   allow re-sending an already-sent quote.
export const STATUS_TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
  draft: ["finalized"],
  finalized: ["draft", "sent"],
  sent: ["sent", "accepted", "paid", "declined"],
  accepted: ["sent", "paid", "declined"],
  paid: ["sent", "accepted", "declined"],
  declined: ["sent", "accepted", "paid"],
};

export function canTransition(from: QuoteStatus, to: QuoteStatus): boolean {
  return STATUS_TRANSITIONS[from].includes(to);
}

// The closed set of statuses, derived from the transition map so it never drifts
// from the state machine. Used to validate an untrusted ?status= filter value.
export const QUOTE_STATUSES = Object.keys(STATUS_TRANSITIONS) as QuoteStatus[];

export function isQuoteStatus(value: string): value is QuoteStatus {
  return (QUOTE_STATUSES as string[]).includes(value);
}

// The reverse map: every status from which a quote may legally become `to`.
// Used to enforce a transition atomically in a conditional UPDATE
// (`.in("status", statusesThatCanBecome(next))`).
export function statusesThatCanBecome(to: QuoteStatus): QuoteStatus[] {
  return (Object.keys(STATUS_TRANSITIONS) as QuoteStatus[]).filter((from) =>
    canTransition(from, to),
  );
}
