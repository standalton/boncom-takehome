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

/**
 * Build the line-item patch for picking a catalog product. Rate and productId
 * always follow the picked product. The description follows too, unless the user
 * typed their own — a description is treated as user-owned only when it's
 * non-empty and doesn't match the previously picked product's name. That way
 * switching from one catalog item to another swaps the name, but a hand-written
 * description is preserved.
 */
export function patchForProductPick(
  picked: ProductOption,
  current: { description: string; productId: string | null },
  products: ProductOption[],
): { description: string; rateCents: number; productId: string } {
  const prevName = current.productId
    ? products.find((p) => p.id === current.productId)?.name
    : undefined;
  const userTyped = current.description.trim() !== "" && current.description !== prevName;
  return {
    description: userTyped ? current.description : picked.name,
    rateCents: picked.rateCents,
    productId: picked.id,
  };
}
