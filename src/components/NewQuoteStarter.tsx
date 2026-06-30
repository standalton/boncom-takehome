/**
 * NewQuoteStarter.tsx — start a new estimate.
 *
 * What:        Pick a client, then create a draft quote and open its editor.
 * Where used:  The /quotes/new route.
 * Notes:       A quote requires a client (client_id is NOT NULL), so the client
 *              is chosen before the quote row is created.
 */
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { createQuote } from "@/actions/quotes";
import { Button } from "@/components/ui/button";

type ClientOption = { id: string; name: string; company: string | null };

export function NewQuoteStarter({ clients }: { clients: ClientOption[] }) {
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [pending, start] = useTransition();
  const router = useRouter();

  function create() {
    if (!clientId) return;
    start(async () => {
      const res = await createQuote(clientId);
      if (res.ok) router.push(`/quotes/${res.id}`);
      else toast.error(res.error);
    });
  }

  return (
    <div className="px-8 py-6">
      <h1 className="mb-6 text-xl font-semibold text-primary">New estimate</h1>
      {clients.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
          You need a client first.{" "}
          <Link href="/clients" className="text-primary underline">
            Add a client
          </Link>
          .
        </div>
      ) : (
        <div className="max-w-md space-y-4 rounded-lg border bg-card p-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Client</label>
            <select
              className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.company ? ` — ${c.company}` : ""}
                </option>
              ))}
            </select>
          </div>
          <Button onClick={create} disabled={pending || !clientId}>
            {pending ? "Creating…" : "Create estimate"}
          </Button>
        </div>
      )}
    </div>
  );
}
