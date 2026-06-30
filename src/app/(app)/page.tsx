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
import { formatCents } from "@/lib/money";
import type { QuoteStatus } from "@/lib/types";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const statusStyles: Record<QuoteStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-100 text-blue-800",
  accepted: "bg-green-100 text-green-800",
  paid: "bg-emerald-100 text-emerald-800",
  declined: "bg-red-100 text-red-800",
};

type QuoteRow = {
  id: string;
  number: string;
  status: QuoteStatus;
  total_cents: number;
  updated_at: string;
  clients: { name: string; company: string | null } | null;
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const res = await listQuotes(q);
  const quotes = (res.ok ? res.data : []) as unknown as QuoteRow[];

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
        <div className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
          {q ? "No estimates match your search." : "No estimates yet. Create your first one."}
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotes.map((quote) => (
                <TableRow key={quote.id}>
                  <TableCell className="font-medium">
                    <Link href={`/quotes/${quote.id}`} className="text-primary hover:underline">
                      {quote.number}
                    </Link>
                  </TableCell>
                  <TableCell>{quote.clients?.name ?? "—"}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusStyles[quote.status]}`}
                    >
                      {quote.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCents(quote.total_cents)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {/* Deterministic UTC date so server and client render identically (no hydration mismatch). */}
                    {new Date(quote.updated_at).toISOString().slice(0, 10)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
