/**
 * quote-queries.ts — read-only quote server actions.
 *
 * What:        Listing and fetching quotes and their activity log (no writes).
 * Where used:  The dashboard, the quotes list, the client detail page, and the
 *              quote editor (load + history dialog).
 * Notes:       Mutations live in actions/quotes.ts; this file is the query side.
 */
"use server";

import { createClient } from "@/lib/supabase/server";
import { toActivityEntries } from "@/lib/activity";

export async function listQuotes(search?: string) {
  const supabase = await createClient();
  let query = supabase
    .from("quotes")
    .select("*, clients(company, contact_name)")
    .order("updated_at", { ascending: false });
  if (search && search.trim()) {
    query = query.ilike("number", `%${search.trim()}%`);
  }
  const { data, error } = await query;
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, data: data ?? [] };
}

export async function listQuotesByClient(clientId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("quotes")
    .select("*, clients(company, contact_name)")
    .eq("client_id", clientId)
    .order("updated_at", { ascending: false });
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, data: data ?? [] };
}

export async function getQuote(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("quotes")
    .select("*, clients(*), line_items(*)")
    .eq("id", id)
    .single();
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, data };
}

export async function listActivity(quoteId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activity_log")
    .select("id, action, detail, created_at, profiles(full_name)")
    .eq("quote_id", quoteId)
    .order("created_at", { ascending: false });
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, data: toActivityEntries(data ?? []) };
}
