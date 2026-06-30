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
import type { QuoteStatus } from "@/lib/types";
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
  finalized: "bg-amber-100 text-amber-800",
  sent: "bg-blue-100 text-blue-800",
  accepted: "bg-green-100 text-green-800",
  paid: "bg-emerald-100 text-emerald-800",
  declined: "bg-red-100 text-red-800",
};

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
            <TableHead>Number</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead>Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {quotes.map((quote) => (
            <TableRow
              key={quote.id}
              onClick={() => router.push(`/quotes/${quote.id}`)}
              className="cursor-pointer select-none transition-colors hover:bg-muted/50 [&_td]:cursor-pointer"
            >
              <TableCell className="font-medium text-primary">{quote.number}</TableCell>
              <TableCell>{quote.clients?.company ?? "—"}</TableCell>
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
                {new Date(quote.updated_at).toISOString().slice(0, 10)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
