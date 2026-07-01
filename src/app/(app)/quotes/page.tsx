/**
 * quotes/page.tsx — the quotes list.
 *
 * What:        Full searchable list of quotes with a "New quote" action.
 * Where used:  The /quotes route (linked from the sidebar).
 */
import Link from "next/link";
import { Plus } from "lucide-react";
import { listQuotes } from "@/actions/quote-queries";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QuoteList, type QuoteListRow } from "@/components/QuoteList";

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const res = await listQuotes(q);
  const quotes = (res.ok ? res.data : []) as unknown as QuoteListRow[];

  return (
    <div className="px-8 py-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-primary">Quotes</h1>
        <Link href="/quotes/new" className={buttonVariants({ size: "sm" })}>
          <Plus className="size-4" />
          New quote
        </Link>
      </div>

      <form className="mb-4 max-w-xs">
        <Input name="q" defaultValue={q ?? ""} placeholder="Search by number…" />
      </form>

      {!res.ok ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          Could not load quotes: {res.error}
        </div>
      ) : quotes.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
          {q ? "No quotes match your search." : "No quotes yet. Create your first one."}
        </div>
      ) : (
        <QuoteList quotes={quotes} />
      )}
    </div>
  );
}
