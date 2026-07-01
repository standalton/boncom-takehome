/**
 * products.ts — product catalog server actions.
 *
 * What:        List and create catalog products (reusable services with a
 *              default rate).
 * Where used:  The products page (and, in Phase 2, the editor's catalog picker).
 */
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isProductUnit } from "@/lib/product-units";
import { pageRange } from "@/lib/pagination";
import type { Product } from "@/lib/types";

const productInput = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().default(""),
  defaultRateCents: z.number().int().min(0, "Rate cannot be negative"),
  // Unit is optional, but if given it must be one of the known billing units.
  unit: z
    .string()
    .optional()
    .default("")
    .refine((v) => v === "" || isProductUnit(v), "Unknown unit"),
});

export async function listProducts(search?: string, page?: number) {
  const supabase = await createClient();
  let query = supabase
    .from("products")
    .select("*", { count: "exact" })
    .eq("active", true)
    .order("name");
  const term = search?.trim();
  if (term) {
    // Strip characters that are delimiters in PostgREST's or() filter syntax so
    // the search term can't break (or inject into) the query.
    const safe = term.replace(/[,()]/g, " ");
    query = query.or(`name.ilike.%${safe}%,description.ilike.%${safe}%`);
  }
  if (page !== undefined) {
    const { from, to } = pageRange(page);
    query = query.range(from, to);
  }
  const { data, error, count } = await query;
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, data: data as Product[], count: count ?? data.length };
}

export async function createProduct(input: unknown) {
  const parsed = productInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0].message };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .insert({
      name: parsed.data.name,
      description: parsed.data.description || null,
      default_rate_cents: parsed.data.defaultRateCents,
      unit: parsed.data.unit || null,
    })
    .select()
    .single();
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/products");
  return { ok: true as const, data: data as Product };
}

export async function updateProduct(id: string, input: unknown) {
  if (!id) return { ok: false as const, error: "Missing product id" };
  const parsed = productInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0].message };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .update({
      name: parsed.data.name,
      description: parsed.data.description || null,
      default_rate_cents: parsed.data.defaultRateCents,
      unit: parsed.data.unit || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/products");
  return { ok: true as const, data: data as Product };
}

// Soft delete: products are referenced by line items, so we retire them by
// clearing `active` (listProducts already filters on it) rather than removing
// the row and orphaning historical quotes.
export async function deleteProduct(id: string) {
  if (!id) return { ok: false as const, error: "Missing product id" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/products");
  return { ok: true as const };
}
