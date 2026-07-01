/**
 * product-option.ts — the shape the quote editor needs for a catalog product.
 *
 * What:        A trimmed, camelCase view of a Product for the line-item picker,
 *              plus a mapper from the DB row. Lives outside the (client) picker
 *              component so server pages can build the list too.
 * Where used:  quotes/[id] page (builds the list), ProductPicker, LineItemRow.
 */
import type { Product } from "@/lib/types";

export type ProductOption = {
  id: string;
  name: string;
  description: string;
  rateCents: number;
};

export function toProductOption(product: Product): ProductOption {
  return {
    id: product.id,
    name: product.name,
    description: product.description ?? "",
    rateCents: product.default_rate_cents,
  };
}
