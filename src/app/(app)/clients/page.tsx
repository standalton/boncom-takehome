/**
 * clients/page.tsx — clients list.
 *
 * What:        Lists clients (searchable by company, contact, email, or the
 *              number of a quote they own) with an "Add client" action.
 * Where used:  The /clients route.
 */
import Link from "next/link";
import { listClients } from "@/actions/clients";
import { parsePage } from "@/lib/pagination";
import { parseSort, CLIENT_SORTS, CLIENT_SORT_DEFAULT } from "@/lib/list-params";
import { AddClientDialog } from "@/components/AddClientDialog";
import { ClientList } from "@/components/ClientList";
import { Pagination } from "@/components/Pagination";
import { Input } from "@/components/ui/input";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; sort?: string; dir?: string }>;
}) {
  const { q, page: pageParam, sort, dir } = await searchParams;
  const page = parsePage(pageParam);
  const sortSpec = parseSort(sort, dir, CLIENT_SORTS, CLIENT_SORT_DEFAULT);
  const res = await listClients(q, page, sortSpec);
  const clients = res.ok ? res.data : [];
  const total = res.ok ? res.count : 0;

  return (
    <div className="px-8 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-primary">Clients</h1>
        <AddClientDialog />
      </div>

      <form className="mb-4 max-w-md">
        <Input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search by company, contact, email, or quote #…"
        />
        {/* Hidden inputs keep an active sort when a new search is submitted. */}
        {sort && <input type="hidden" name="sort" value={sort} />}
        {dir && <input type="hidden" name="dir" value={dir} />}
      </form>

      {!res.ok ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          Could not load clients: {res.error}
        </div>
      ) : clients.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
          {q ? (
            "No clients match your search."
          ) : (
            <>
              No clients yet. Add your first client, or{" "}
              <Link
                href="/import?target=clients"
                className="text-primary underline underline-offset-4"
              >
                import a spreadsheet
              </Link>
              .
            </>
          )}
        </div>
      ) : (
        <>
          <ClientList clients={clients} />
          <Pagination page={page} total={total} />
        </>
      )}
    </div>
  );
}
