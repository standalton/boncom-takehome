/**
 * quotes/new/page.tsx — new quote route.
 *
 * What:        Loads clients and renders the new-quote starter.
 * Where used:  The /quotes/new route.
 */
import { listClients } from "@/actions/clients";
import { NewQuoteStarter } from "@/components/NewQuoteStarter";

export default async function NewQuotePage() {
  const res = await listClients();
  const clients = res.ok ? res.data : [];
  return (
    <NewQuoteStarter
      clients={clients.map((c) => ({ id: c.id, name: c.name, company: c.company }))}
    />
  );
}
