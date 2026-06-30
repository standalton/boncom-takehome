/**
 * NewQuoteStarter.tsx — start a new quote.
 *
 * What:        Pick a client (or add one inline), then create a draft quote and
 *              open its editor.
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
import type { Client } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ClientPicker, type ClientOption } from "@/components/ClientPicker";

export function NewQuoteStarter({ clients: initialClients }: { clients: ClientOption[] }) {
  const [clients, setClients] = useState<ClientOption[]>(initialClients);
  const [clientId, setClientId] = useState(initialClients[0]?.id ?? "");
  const [pending, start] = useTransition();
  const router = useRouter();

  function addClient(client: Client) {
    setClients((prev) => [...prev, { id: client.id, name: client.name, company: client.company }]);
  }

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
      <h1 className="mb-6 text-xl font-semibold text-primary">New quote</h1>
      <div className="max-w-md space-y-4 rounded-lg border bg-card p-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">Client</label>
          <ClientPicker
            clients={clients}
            value={clientId}
            onChange={setClientId}
            onClientAdded={(client) => {
              addClient(client);
              setClientId(client.id);
            }}
          />
          {clients.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No clients yet — add one above, or{" "}
              <Link href="/clients" className="text-primary underline">
                manage clients
              </Link>
              .
            </p>
          )}
        </div>
        <Button onClick={create} disabled={pending || !clientId}>
          {pending ? "Creating…" : "Create quote"}
        </Button>
      </div>
    </div>
  );
}
