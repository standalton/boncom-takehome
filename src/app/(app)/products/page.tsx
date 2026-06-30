/**
 * products/page.tsx — product catalog list.
 *
 * What:        Lists catalog products with an "Add product" action.
 * Where used:  The /products route.
 */
import { listProducts } from "@/actions/products";
import { formatCents } from "@/lib/money";
import { AddProductDialog } from "@/components/AddProductDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function ProductsPage() {
  const res = await listProducts();
  const products = res.ok ? res.data : [];

  return (
    <div className="px-8 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-primary">Products</h1>
        <AddProductDialog />
      </div>

      {!res.ok ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          Could not load products: {res.error}
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
          No products yet. Add the services you offer to reuse them in quotes.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="text-right">Default rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => (
                <TableRow key={p.id} className="transition-colors hover:bg-muted/50">
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-muted-foreground">{p.description ?? "—"}</TableCell>
                  <TableCell>{p.unit ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCents(p.default_rate_cents)}
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
