/**
 * (app)/page.tsx — dashboard: the estimate list.
 *
 * What:        Lists all quotes (client, total, status, last updated) with
 *              search by number and a "New estimate" action. The landing screen.
 * Where used:  The "/" route inside the authenticated shell.
 */
import Link from "next/link";
import { Plus } from "lucide-react";
import { listQuotes } from "@/actions/quotes";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QuoteList, type QuoteListRow } from "@/components/QuoteList";

export default async function DashboardPage({
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
        <h1 className="text-xl font-semibold text-primary">Estimates</h1>
        <Link href="/quotes/new" className={buttonVariants({ size: "sm" })}>
          <Plus className="size-4" />
          New estimate
        </Link>
      </div>

      <form className="mb-4 max-w-xs">
        <Input name="q" defaultValue={q ?? ""} placeholder="Search by number…" />
      </form>

      {!res.ok ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          Could not load estimates: {res.error}
        </div>
      ) : quotes.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
          {q ? "No estimates match your search." : "No estimates yet. Create your first one."}
        </div>
      ) : (
        <QuoteList quotes={quotes} />
      )}
    </div>
  );
}
