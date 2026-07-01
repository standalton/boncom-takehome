/**
 * quotes/page.tsx — the quotes list.
 *
 * What:        Full searchable, sortable, status-filterable list of quotes with
 *              a "New quote" action.
 * Where used:  The /quotes route (linked from the sidebar).
 */
import Link from "next/link";
import { Plus } from "lucide-react";
import { listQuotes, listQuoteStatusesInUse } from "@/actions/quote-queries";
import { parsePage } from "@/lib/pagination";
import { parseSort, QUOTE_SORTS, QUOTE_SORT_DEFAULT } from "@/lib/list-params";
import { statusMeta } from "@/lib/status-meta";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FilterSelect } from "@/components/FilterSelect";
import { Pagination } from "@/components/Pagination";
import { QuoteList, type QuoteListRow } from "@/components/QuoteList";
import { ImportSoonButton } from "@/components/import/ImportSoonButton";

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; sort?: string; dir?: string; status?: string }>;
}) {
  const { q, page: pageParam, sort, dir, status } = await searchParams;
  const page = parsePage(pageParam);
  const sortSpec = parseSort(sort, dir, QUOTE_SORTS, QUOTE_SORT_DEFAULT);
  const [res, statusesRes] = await Promise.all([
    listQuotes(q, page, sortSpec, status),
    listQuoteStatusesInUse(),
  ]);
  const quotes = (res.ok ? res.data : []) as unknown as QuoteListRow[];
  const total = res.ok ? res.count : 0;
  // Only offer statuses that some quote actually has.
  const statusOptions = (statusesRes.ok ? statusesRes.data : []).map((s) => ({
    value: s,
    label: statusMeta[s].label,
  }));

  return (
    <div className="px-8 py-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-primary">Quotes</h1>
        <div className="flex items-center gap-2">
          <ImportSoonButton />
          <Link href="/quotes/new" className={buttonVariants({ size: "sm" })}>
            <Plus className="size-4" />
            New quote
          </Link>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        {/* Hidden inputs keep an active sort/filter when a new search is submitted. */}
        <form className="max-w-xs flex-1">
          <Input name="q" defaultValue={q ?? ""} placeholder="Search by number…" />
          {sort && <input type="hidden" name="sort" value={sort} />}
          {dir && <input type="hidden" name="dir" value={dir} />}
          {status && <input type="hidden" name="status" value={status} />}
        </form>
        {statusOptions.length > 0 && (
          <FilterSelect
            param="status"
            options={statusOptions}
            allLabel="All statuses"
            className="w-44"
          />
        )}
      </div>

      {!res.ok ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          Could not load quotes: {res.error}
        </div>
      ) : quotes.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
          {q || status ? "No quotes match your search." : "No quotes yet. Create your first one."}
        </div>
      ) : (
        <>
          <QuoteList quotes={quotes} />
          <Pagination page={page} total={total} />
        </>
      )}
    </div>
  );
}
