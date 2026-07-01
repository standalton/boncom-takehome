/**
 * products/page.tsx — product catalog list.
 *
 * What:        Lists catalog products with an "Add product" action.
 * Where used:  The /products route.
 */
import { listProducts } from "@/actions/products";
import { formatCents } from "@/lib/money";
import { formatUnit } from "@/lib/product-units";
import { parsePage } from "@/lib/pagination";
import { AddProductDialog } from "@/components/AddProductDialog";
import { ProductActionsMenu } from "@/components/ProductActionsMenu";
import { Pagination } from "@/components/Pagination";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q, page: pageParam } = await searchParams;
  const page = parsePage(pageParam);
  const res = await listProducts(q, page);
  const products = res.ok ? res.data : [];
  const total = res.ok ? res.count : 0;

  return (
    <div className="px-8 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-primary">Products</h1>
        <AddProductDialog />
      </div>

      <form className="mb-4 max-w-xs">
        <Input name="q" defaultValue={q ?? ""} placeholder="Search by name or description…" />
      </form>

      {!res.ok ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          Could not load products: {res.error}
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
          {q
            ? "No products match your search."
            : "No products yet. Add the services you offer to reuse them in quotes."}
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
                <TableHead className="w-10" aria-label="Actions" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => (
                <TableRow key={p.id} className="transition-colors hover:bg-muted/50">
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-muted-foreground">{p.description ?? "—"}</TableCell>
                  <TableCell>{formatUnit(p.unit)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCents(p.default_rate_cents)}
                  </TableCell>
                  <TableCell className="text-right">
                    <ProductActionsMenu product={p} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination page={page} total={total} />
        </div>
      )}
    </div>
  );
}
