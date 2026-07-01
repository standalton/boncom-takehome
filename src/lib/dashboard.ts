/**
 * dashboard.ts — pure derivations for the dashboard overview.
 *
 * What:        Turns the raw quote list into headline stats: open-pipeline value,
 *              won value + win rate, awaiting-reply count, and draft count.
 * Where used:  The dashboard page (app/(app)/page.tsx).
 * Notes:       Pure and dependency-free so it stays testable. Money is integer
 *              cents throughout.
 */
import type { QuoteStatus } from "@/lib/types";

export type DashboardQuote = {
  id: string;
  number: string;
  status: QuoteStatus;
  total_cents: number;
  clients: { company: string; contact_name: string | null } | null;
};

export type DashboardStats = {
  openPipelineCents: number;
  openCount: number;
  wonCents: number;
  winRatePercent: number | null;
  sentCents: number;
  sentCount: number;
  draftCount: number;
};

const sum = (quotes: DashboardQuote[]) => quotes.reduce((acc, q) => acc + q.total_cents, 0);

export function computeStats(quotes: DashboardQuote[]): DashboardStats {
  const open = quotes.filter((q) => q.status === "finalized" || q.status === "sent");
  const won = quotes.filter((q) => q.status === "accepted" || q.status === "paid");
  const sent = quotes.filter((q) => q.status === "sent");
  const declinedCount = quotes.filter((q) => q.status === "declined").length;

  // Win rate is only meaningful once quotes have been decided (won or declined).
  const decided = won.length + declinedCount;
  const winRatePercent = decided > 0 ? Math.round((won.length / decided) * 100) : null;

  return {
    openPipelineCents: sum(open),
    openCount: open.length,
    wonCents: sum(won),
    winRatePercent,
    sentCents: sum(sent),
    sentCount: sent.length,
    draftCount: quotes.filter((q) => q.status === "draft").length,
  };
}
