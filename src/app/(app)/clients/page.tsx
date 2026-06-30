/**
 * clients/page.tsx — clients list.
 *
 * What:        Lists all clients (shared workspace) with an "Add client" action.
 * Where used:  The /clients route.
 */
import { listClients } from "@/actions/clients";
import { AddClientDialog } from "@/components/AddClientDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function ClientsPage() {
  const res = await listClients();
  const clients = res.ok ? res.data : [];

  return (
    <div className="px-8 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-primary">Clients</h1>
        <AddClientDialog />
      </div>

      {!res.ok ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          Could not load clients: {res.error}
        </div>
      ) : clients.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
          No clients yet. Add your first client to start a quote.
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Email</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.company ?? "—"}</TableCell>
                  <TableCell>{c.email ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
