/**
 * ProductPicker.tsx — pick a catalog product to fill a line item.
 *
 * What:        A compact "Catalog" trigger that opens a searchable list of
 *              products. Choosing one hands the product back to the caller, which
 *              fills the line's description and rate. It does not stay "selected"
 *              — it's an action picker, not a bound field, so the description
 *              remains freely editable afterward.
 * Where used:  LineItemRow (one per line).
 * Notes:       Built on Base UI's Combobox, mirroring ClientPicker. No inline
 *              "add product" — the catalog is managed on the /products page.
 */
"use client";

import { useMemo, useState } from "react";
import { Combobox } from "@base-ui/react/combobox";
import { Package, Search } from "lucide-react";
import { formatCents } from "@/lib/money";
import type { ProductOption } from "@/lib/product-option";

type Item = { value: string; label: string; product: ProductOption };

type Props = {
  products: ProductOption[];
  onSelect: (product: ProductOption) => void;
};

export function ProductPicker({ products, onSelect }: Props) {
  const items = useMemo<Item[]>(
    () =>
      products.map((p) => ({
        value: p.id,
        // label drives filtering; include the description so it's searchable too.
        label: p.description ? `${p.name} ${p.description}` : p.name,
        product: p,
      })),
    [products],
  );
  const [query, setQuery] = useState("");

  return (
    <Combobox.Root
      items={items}
      value={null}
      onValueChange={(item: Item | null) => {
        if (item) onSelect(item.product);
      }}
      onInputValueChange={setQuery}
    >
      <Combobox.Trigger
        aria-label="Choose from catalog"
        className="group/cat flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-input bg-transparent px-2.5 text-xs font-medium text-muted-foreground outline-none transition-colors hover:border-ring/60 hover:bg-muted/50 hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40 data-popup-open:border-ring"
      >
        <Package className="size-3.5" />
        Catalog
      </Combobox.Trigger>

      <Combobox.Portal>
        <Combobox.Positioner sideOffset={4} align="start" className="isolate z-50">
          <Combobox.Popup className="w-72 overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0">
            <div className="flex items-center gap-2 border-b px-3">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <Combobox.Input
                placeholder="Search catalog…"
                className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>

            <div className="max-h-64 overflow-y-auto p-1">
              <Combobox.Empty className="text-center text-sm text-muted-foreground">
                <div className="px-3 py-6">No products match “{query}”.</div>
              </Combobox.Empty>

              <Combobox.List>
                {(item: Item) => (
                  <Combobox.Item
                    key={item.value}
                    value={item}
                    className="press flex cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2 text-sm outline-none select-none hover:bg-accent data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                  >
                    <span className="line-clamp-1">{item.product.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                      {formatCents(item.product.rateCents)}
                    </span>
                  </Combobox.Item>
                )}
              </Combobox.List>
            </div>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}
