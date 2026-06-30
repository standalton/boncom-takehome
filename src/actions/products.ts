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
import type { Product } from "@/lib/types";

const productInput = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().default(""),
  defaultRateCents: z.number().int().min(0, "Rate cannot be negative"),
  unit: z.string().optional().default(""),
});

export async function listProducts() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("active", true)
    .order("name");
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, data: data as Product[] };
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
