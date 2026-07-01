/**
 * (app)/page.tsx — dashboard: an at-a-glance overview.
 *
 * What:        Lifecycle-aware metrics (open pipeline, won + win rate, awaiting
 *              reply, drafts), a pipeline breakdown, and the most recent quotes.
 *              The landing screen.
 * Where used:  The "/" route inside the authenticated shell.
 * Notes:       All figures derive from real data; the pure math lives in
 *              lib/dashboard.
 */
import Link from "next/link";
import { Plus } from "lucide-react";
import { listQuotes } from "@/actions/quote-queries";
import { computeStats, type DashboardQuote } from "@/lib/dashboard";
import { formatCents } from "@/lib/money";
import { helpText } from "@/lib/help-text";
import { statusMeta } from "@/lib/status-meta";
import type { QuoteStatus } from "@/lib/types";
import { buttonVariants } from "@/components/ui/button";
import { HelpHint } from "@/components/HelpHint";
import { QuoteList, type QuoteListRow } from "@/components/QuoteList";

const statusOrder: QuoteStatus[] = ["draft", "finalized", "sent", "accepted", "paid", "declined"];

export default async function DashboardPage() {
  const quotesRes = await listQuotes();
  if (!quotesRes.ok) console.error(`Dashboard: failed to load quotes: ${quotesRes.error}`);

  const rows = quotesRes.ok ? quotesRes.data : [];
  const quotes = rows as unknown as DashboardQuote[];
  const recent = rows.slice(0, 10) as unknown as QuoteListRow[];
  const stats = computeStats(quotes);

  const cards = [
    {
      label: "Open pipeline",
      value: formatCents(stats.openPipelineCents),
      sub: `${stats.openCount} awaiting a decision`,
      hint: helpText.dashOpenPipeline,
    },
    {
      label: "Won",
      value: formatCents(stats.wonCents),
      sub: stats.winRatePercent !== null ? `${stats.winRatePercent}% win rate` : "no decisions yet",
      hint: helpText.dashWon,
    },
    {
      label: "Awaiting reply",
      value: String(stats.sentCount),
      sub: "sent, to follow up",
      hint: helpText.dashAwaiting,
    },
    { label: "Drafts", value: String(stats.draftCount), sub: "in progress", hint: helpText.dashDrafts },
  ];

  return (
    <div className="space-y-6 px-8 py-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-primary">Dashboard</h1>
        <Link href="/quotes/new" className={buttonVariants({ size: "sm" })}>
          <Plus className="size-4" />
          New quote
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              {c.label}
              <HelpHint text={c.hint} />
            </div>
            <div className="mt-1 text-2xl font-semibold text-primary tabular-nums">{c.value}</div>
            <div className="mt-1 text-xs text-muted-foreground">{c.sub}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-4 shadow-sm">
        <span className="mr-1 flex items-center gap-1.5 text-sm font-medium">
          Pipeline
          <HelpHint text={helpText.dashPipeline} />
        </span>
        {statusOrder.map((s) => (
          <Link
            key={s}
            href={`/quotes?status=${s}`}
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium capitalize outline-none transition-all duration-150 hover:-translate-y-0.5 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-ring/50 active:translate-y-0 active:scale-[0.98] active:shadow-none ${statusMeta[s].chip}`}
          >
            {s}
            <span className="tabular-nums opacity-80">
              {quotes.filter((q) => q.status === s).length}
            </span>
          </Link>
        ))}
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            Recent quotes
            <HelpHint text={helpText.dashRecentQuotes} />
          </h2>
          <Link href="/quotes" className="text-sm text-primary hover:underline">
            View all →
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
            No quotes yet. Create your first one.
          </div>
        ) : (
          <QuoteList quotes={recent} />
        )}
      </div>
    </div>
  );
}
