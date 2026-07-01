/**
 * clients.ts — client (customer) server actions.
 *
 * What:        List and create clients. Validates input server-side and stamps
 *              the creating user.
 * Where used:  The clients page and the quote editor's client picker.
 */
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { pageRange } from "@/lib/pagination";
import type { Client } from "@/lib/types";

const clientInput = z.object({
  company: z.string().min(1, "Company is required"),
  contactName: z.string().optional().default(""),
  email: z
    .string()
    .optional()
    .default("")
    .refine((v) => !v || /.+@.+\..+/.test(v), "Enter a valid email"),
  phone: z.string().optional().default(""),
});

export async function listClients(search?: string, page?: number) {
  const supabase = await createClient();
  let query = supabase.from("clients").select("*", { count: "exact" }).order("company");
  const term = search?.trim();
  if (term) {
    // Strip characters that are delimiters in PostgREST's or() filter syntax so
    // the search term can't break (or inject into) the query.
    const safe = term.replace(/[,()]/g, " ");
    const orParts = [
      `company.ilike.%${safe}%`,
      `contact_name.ilike.%${safe}%`,
      `email.ilike.%${safe}%`,
    ];

    // Also match clients who have a quote whose number matches the term.
    const { data: quoteMatches, error: quoteErr } = await supabase
      .from("quotes")
      .select("client_id")
      .ilike("number", `%${safe}%`);
    if (quoteErr) return { ok: false as const, error: quoteErr.message };
    const clientIds = [
      ...new Set((quoteMatches ?? []).map((r) => r.client_id).filter(Boolean)),
    ];
    if (clientIds.length) {
      // UUIDs contain no or()-delimiter characters, so this is safe to inline.
      orParts.push(`id.in.(${clientIds.join(",")})`);
    }

    query = query.or(orParts.join(","));
  }
  if (page !== undefined) {
    const { from, to } = pageRange(page);
    query = query.range(from, to);
  }
  const { data, error, count } = await query;
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, data: data as Client[], count: count ?? data.length };
}

export async function createClientRecord(input: unknown) {
  const parsed = clientInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0].message };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("clients")
    .insert({
      company: parsed.data.company,
      contact_name: parsed.data.contactName || null,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      created_by: user?.id,
    })
    .select()
    .single();

  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/clients");
  return { ok: true as const, data: data as Client };
}

export async function updateClient(id: string, input: unknown) {
  if (!id) return { ok: false as const, error: "Missing client id" };
  const parsed = clientInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0].message };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .update({
      company: parsed.data.company,
      contact_name: parsed.data.contactName || null,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/clients");
  return { ok: true as const, data: data as Client };
}

export async function deleteClient(id: string) {
  if (!id) return { ok: false as const, error: "Missing client id" };
  const supabase = await createClient();
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) {
    // 23503 = foreign-key violation: the client is still referenced by quotes.
    // We never orphan quote history, so refuse with a clear message instead.
    if (error.code === "23503") {
      return {
        ok: false as const,
        error: "This client has quotes, so it can't be deleted. Delete their quotes first.",
      };
    }
    return { ok: false as const, error: error.message };
  }
  revalidatePath("/clients");
  return { ok: true as const };
}
