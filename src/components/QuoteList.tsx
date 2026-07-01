/**
 * QuoteList.tsx — the dashboard quote table.
 *
 * What:        Renders quotes as fully clickable rows (the whole row navigates,
 *              with a hover highlight), with status badges and totals.
 * Where used:  The dashboard page.
 * Notes:       Client component so rows can navigate on click.
 */
"use client";

import { useRouter } from "next/navigation";
import { formatCents } from "@/lib/money";
import { statusMeta } from "@/lib/status-meta";
import type { QuoteStatus } from "@/lib/types";
import { DeleteQuoteButton } from "@/components/DeleteQuoteButton";
import { SortableHead } from "@/components/SortableHead";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Locale/timezone-aware, so the rendered value depends on the viewer's zone.
// Both are wrapped in suppressHydrationWarning at the call site because the
// server (UTC) and client can legitimately format the same instant differently.
function formatUpdatedDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatUpdatedTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export type QuoteListRow = {
  id: string;
  number: string;
  status: QuoteStatus;
  total_cents: number;
  updated_at: string;
  clients: { company: string; contact_name: string | null } | null;
};

export function QuoteList({ quotes }: { quotes: QuoteListRow[] }) {
  const router = useRouter();

  return (
    <div className="overflow-hidden rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <SortableHead column="number" label="Number" className="w-[14%]" />
            <TableHead>Client</TableHead>
            <SortableHead column="status" label="Status" className="w-[15%]" />
            <SortableHead
              column="total_cents"
              label="Total"
              align="right"
              firstDir="desc"
              className="w-[15%] pr-12"
            />
            <SortableHead
              column="updated_at"
              label="Updated"
              firstDir="desc"
              className="w-[18%] pl-8"
            />
            <TableHead className="w-10">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {quotes.map((quote) => (
            <TableRow
              key={quote.id}
              onClick={() => router.push(`/quotes/${quote.id}`)}
              className="cursor-pointer select-none transition-all duration-150 hover:bg-accent active:scale-[0.99] active:bg-primary/10 [&_td]:cursor-pointer"
            >
              <TableCell className="font-medium text-primary">{quote.number}</TableCell>
              <TableCell>{quote.clients?.company ?? "—"}</TableCell>
              <TableCell>
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusMeta[quote.status].chip}`}
                >
                  {quote.status}
                </span>
              </TableCell>
              <TableCell className="text-right tabular-nums pr-12">
                {formatCents(quote.total_cents)}
              </TableCell>
              <TableCell className="pl-8">
                <div className="text-sm text-foreground tabular-nums" suppressHydrationWarning>
                  {formatUpdatedDate(quote.updated_at)}
                </div>
                <div className="text-xs text-muted-foreground tabular-nums" suppressHydrationWarning>
                  {formatUpdatedTime(quote.updated_at)}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <DeleteQuoteButton
                  id={quote.id}
                  number={quote.number}
                  afterDelete={() => router.refresh()}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
