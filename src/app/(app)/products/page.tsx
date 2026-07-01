/**
 * products/page.tsx — product catalog list.
 *
 * What:        Lists catalog products with an "Add product" action.
 * Where used:  The /products route.
 */
import { listProducts, listProductUnitsInUse } from "@/actions/products";
import { formatCents } from "@/lib/money";
import { formatUnit } from "@/lib/product-units";
import { parsePage } from "@/lib/pagination";
import { parseSort, PRODUCT_SORTS, PRODUCT_SORT_DEFAULT } from "@/lib/list-params";
import { AddProductDialog } from "@/components/AddProductDialog";
import { ProductActionsMenu } from "@/components/ProductActionsMenu";
import { ImportEntryButton } from "@/components/import/ImportEntryButton";
import { FilterSelect } from "@/components/FilterSelect";
import { SortableHead } from "@/components/SortableHead";
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
  searchParams: Promise<{ q?: string; page?: string; sort?: string; dir?: string; unit?: string }>;
}) {
  const { q, page: pageParam, sort, dir, unit } = await searchParams;
  const page = parsePage(pageParam);
  const sortSpec = parseSort(sort, dir, PRODUCT_SORTS, PRODUCT_SORT_DEFAULT);
  const [res, unitsRes] = await Promise.all([
    listProducts(q, page, sortSpec, unit),
    listProductUnitsInUse(),
  ]);
  const products = res.ok ? res.data : [];
  const total = res.ok ? res.count : 0;
  // Only offer units that some active product actually uses.
  const unitOptions = unitsRes.ok ? unitsRes.data.map((u) => ({ value: u.value, label: u.label })) : [];

  return (
    <div className="px-8 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-primary">Products</h1>
        <div className="flex gap-2">
          <ImportEntryButton target="products" />
          <AddProductDialog />
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        {/* Hidden inputs keep an active sort/filter when a new search is submitted. */}
        <form className="max-w-xs flex-1">
          <Input name="q" defaultValue={q ?? ""} placeholder="Search by name or description…" />
          {sort && <input type="hidden" name="sort" value={sort} />}
          {dir && <input type="hidden" name="dir" value={dir} />}
          {unit && <input type="hidden" name="unit" value={unit} />}
        </form>
        {unitOptions.length > 0 && (
          <FilterSelect
            param="unit"
            options={unitOptions}
            allLabel="All units"
            className="w-44"
          />
        )}
      </div>

      {!res.ok ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          Could not load products: {res.error}
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
          {q || unit
            ? "No products match your search."
            : "No products yet. Add the services you offer to reuse them in quotes."}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHead column="name" label="Name" />
                <TableHead>Description</TableHead>
                <SortableHead column="unit" label="Unit" />
                <SortableHead
                  column="default_rate_cents"
                  label="Default rate"
                  align="right"
                  firstDir="desc"
                />
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
