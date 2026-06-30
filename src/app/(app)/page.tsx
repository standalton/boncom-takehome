/**
 * (app)/page.tsx — dashboard: an at-a-glance overview.
 *
 * What:        Headline metrics (count, total value, won, awaiting), a status
 *              breakdown, and the most recent estimates. The landing screen.
 * Where used:  The "/" route inside the authenticated shell.
 */
import Link from "next/link";
import { Plus } from "lucide-react";
import { listQuotes } from "@/actions/quotes";
import { formatCents } from "@/lib/money";
import type { QuoteStatus } from "@/lib/types";
import { buttonVariants } from "@/components/ui/button";
import { QuoteList, type QuoteListRow } from "@/components/QuoteList";

const statusOrder: QuoteStatus[] = ["draft", "sent", "accepted", "paid", "declined"];
const statusStyles: Record<QuoteStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-100 text-blue-800",
  accepted: "bg-green-100 text-green-800",
  paid: "bg-emerald-100 text-emerald-800",
  declined: "bg-red-100 text-red-800",
};

function sumValue(rows: QuoteListRow[]) {
  return rows.reduce((acc, r) => acc + r.total_cents, 0);
}

export default async function DashboardPage() {
  const res = await listQuotes();
  const quotes = (res.ok ? res.data : []) as unknown as QuoteListRow[];

  const won = quotes.filter((q) => q.status === "accepted" || q.status === "paid");
  const sent = quotes.filter((q) => q.status === "sent");
  const recent = quotes.slice(0, 5);

  const cards = [
    { label: "Total estimates", value: String(quotes.length), sub: "across all statuses" },
    { label: "Total value", value: formatCents(sumValue(quotes)), sub: "all estimates" },
    { label: "Won", value: formatCents(sumValue(won)), sub: `${won.length} accepted or paid` },
    { label: "Awaiting reply", value: formatCents(sumValue(sent)), sub: `${sent.length} sent` },
  ];

  return (
    <div className="px-8 py-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-primary">Dashboard</h1>
        <Link href="/quotes/new" className={buttonVariants({ size: "sm" })}>
          <Plus className="size-4" />
          New estimate
        </Link>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="text-sm text-muted-foreground">{c.label}</div>
            <div className="mt-1 text-2xl font-semibold text-primary tabular-nums">{c.value}</div>
            <div className="mt-1 text-xs text-muted-foreground">{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Status breakdown */}
      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border bg-card p-4 shadow-sm">
        <span className="mr-1 text-sm font-medium">Pipeline</span>
        {statusOrder.map((s) => {
          const count = quotes.filter((q) => q.status === s).length;
          return (
            <span
              key={s}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusStyles[s]}`}
            >
              {s}
              <span className="tabular-nums opacity-80">{count}</span>
            </span>
          );
        })}
      </div>

      {/* Recent estimates */}
      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Recent estimates</h2>
          <Link href="/quotes" className="text-sm text-primary hover:underline">
            View all →
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
            No estimates yet. Create your first one.
          </div>
        ) : (
          <QuoteList quotes={recent} />
        )}
      </div>
    </div>
  );
}
