/**
 * ClientList.tsx — the clients table with inline, expandable quote history.
 *
 * What:        Lists clients; clicking a row expands it in place to reveal that
 *              client's quotes (number, status, total, updated), each linking to
 *              the quote. Quotes are lazy-loaded the first time a row is opened.
 * Where used:  The clients page.
 * Notes:       Client component (interactive expand + on-demand fetch). Reuses
 *              statusMeta from StatusSelect so status pills match the editor.
 */
"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { listQuotesByClient } from "@/actions/quote-queries";
import { formatCents } from "@/lib/money";
import { statusMeta } from "@/components/StatusSelect";
import { ClientActionsMenu } from "@/components/ClientActionsMenu";
import type { Client, QuoteStatus } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ClientQuote = {
  id: string;
  number: string;
  status: QuoteStatus;
  total_cents: number;
  valid_until: string | null;
};

type QuoteState =
  | { loading: true }
  | { loading: false; error: string }
  | { loading: false; quotes: ClientQuote[] };

export function ClientList({ clients }: { clients: Client[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [quotesById, setQuotesById] = useState<Record<string, QuoteState>>({});

  async function toggle(id: string) {
    if (openId === id) {
      setOpenId(null);
      return;
    }
    setOpenId(id);
    if (quotesById[id]) return; // already loaded (or loading)

    setQuotesById((prev) => ({ ...prev, [id]: { loading: true } }));
    const res = await listQuotesByClient(id);
    setQuotesById((prev) => ({
      ...prev,
      [id]: res.ok
        ? { loading: false, quotes: res.data as unknown as ClientQuote[] }
        : { loading: false, error: res.error },
    }));
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Company</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead className="w-10" aria-label="Actions" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map((c) => {
            const open = openId === c.id;
            const state = quotesById[c.id];
            return (
              <Fragment key={c.id}>
                <TableRow
                  onClick={() => toggle(c.id)}
                  aria-expanded={open}
                  className="cursor-pointer select-none transition-colors hover:bg-muted/50 [&_td]:cursor-pointer"
                >
                  <TableCell className="font-medium text-primary">
                    <span className="flex items-center gap-1.5">
                      <ChevronRight
                        className={`size-4 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`}
                      />
                      {c.company}
                    </span>
                  </TableCell>
                  <TableCell>{c.contact_name ?? "—"}</TableCell>
                  <TableCell>{c.email ?? "—"}</TableCell>
                  <TableCell>{c.phone ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <ClientActionsMenu client={c} />
                  </TableCell>
                </TableRow>
                {open && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={5} className="bg-muted/20 p-0">
                      <ClientQuotes state={state} />
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

// Columns shared by the header and each quote row so they line up exactly. The
// 1fr on Total lets the section fill the full row width (details on the left,
// amounts on the right) instead of floating in a narrow box.
const quoteGrid = "grid grid-cols-[7rem_8rem_1fr_9rem] items-center gap-4";

function ClientQuotes({ state }: { state: QuoteState | undefined }) {
  if (!state || state.loading) {
    return <p className="py-3 pr-6 pl-11 text-sm text-muted-foreground">Loading quotes…</p>;
  }
  if ("error" in state) {
    return (
      <p className="py-3 pr-6 pl-11 text-sm text-destructive">Could not load quotes: {state.error}</p>
    );
  }
  if (state.quotes.length === 0) {
    return <p className="py-3 pr-6 pl-11 text-sm text-muted-foreground">No quotes for this client yet.</p>;
  }

  const count = state.quotes.length;

  return (
    <div className="py-3 pr-6 pl-11">
      <p className="mb-1.5 text-xs text-muted-foreground">
        {count} {count === 1 ? "quote" : "quotes"}
      </p>
      <div
        className={`${quoteGrid} border-b px-3 pb-1.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase`}
      >
        <span>Quote</span>
        <span>Status</span>
        <span className="text-right">Total</span>
        <span className="text-right">Expires</span>
      </div>
      {/* Cap the height so a client with 100+ quotes scrolls in place instead of
          pushing the whole page down. */}
      <ul className="max-h-72 divide-y overflow-y-auto">
        {state.quotes.map((q) => (
          <li key={q.id}>
            <Link
              href={`/quotes/${q.id}`}
              className={`${quoteGrid} rounded-md px-3 py-2 text-sm transition-colors hover:bg-background`}
            >
              <span className="font-medium text-primary">{q.number}</span>
              <span>
                <span
                  className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${statusMeta[q.status].pill}`}
                >
                  {statusMeta[q.status].label}
                </span>
              </span>
              <span className="text-right tabular-nums">{formatCents(q.total_cents)}</span>
              <span className="text-right text-muted-foreground tabular-nums">
                {q.valid_until ?? "—"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
