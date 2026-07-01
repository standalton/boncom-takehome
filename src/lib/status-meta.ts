/**
 * status-meta.ts — display metadata for each quote status.
 *
 * What:        For every QuoteStatus: a dot colour, a `pill` style (bordered
 *              badge, used in the editor), a `chip` style (filled, used in list
 *              rows and the dashboard pipeline), and a label. The single source
 *              of truth so these can't drift across screens.
 * Where used:  StatusSelect (badge/menu), ClientList, QuoteList, the quotes list
 *              page, and the dashboard.
 * Notes:       Plain data — deliberately NOT a "use client" module — so server
 *              components (e.g. the quotes list) can import it too.
 */
import type { QuoteStatus } from "@/lib/types";

export const statusMeta: Record<
  QuoteStatus,
  { dot: string; pill: string; chip: string; label: string }
> = {
  draft: {
    dot: "#9ca3af",
    pill: "bg-muted text-muted-foreground border-border",
    chip: "bg-muted text-muted-foreground",
    label: "Draft",
  },
  finalized: {
    dot: "#f59e0b",
    pill: "bg-amber-50 text-amber-800 border-amber-200",
    chip: "bg-amber-100 text-amber-800",
    label: "Finalized",
  },
  sent: {
    dot: "#3b82f6",
    pill: "bg-blue-50 text-blue-800 border-blue-200",
    chip: "bg-blue-100 text-blue-800",
    label: "Sent",
  },
  accepted: {
    dot: "#22c55e",
    pill: "bg-green-50 text-green-800 border-green-200",
    chip: "bg-green-100 text-green-800",
    label: "Accepted",
  },
  paid: {
    dot: "#065f46",
    pill: "bg-emerald-600 text-white border-emerald-600",
    chip: "bg-emerald-600 text-white",
    label: "Paid",
  },
  declined: {
    dot: "#ef4444",
    pill: "bg-red-50 text-red-800 border-red-200",
    chip: "bg-red-100 text-red-800",
    label: "Declined",
  },
};
