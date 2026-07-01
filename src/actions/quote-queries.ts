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
import { pageRange } from "@/lib/pagination";
import { applySort, QUOTE_SORT_DEFAULT, type SortSpec } from "@/lib/list-params";
import { isQuoteStatus, QUOTE_STATUSES } from "@/lib/quote-status";
import type { QuoteStatus } from "@/lib/types";

export async function listQuotes(
  search?: string,
  page?: number,
  sort: SortSpec = QUOTE_SORT_DEFAULT,
  status?: string,
) {
  const supabase = await createClient();
  let query = supabase
    .from("quotes")
    .select("*, clients(company, contact_name)", { count: "exact" });
  if (search && search.trim()) {
    query = query.ilike("number", `%${search.trim()}%`);
  }
  if (status && isQuoteStatus(status)) {
    query = query.eq("status", status);
  }
  query = applySort(query, sort);
  // A page number means "paginate"; its absence (e.g. the dashboard) means "all".
  if (page !== undefined) {
    const { from, to } = pageRange(page);
    query = query.range(from, to);
  }
  const { data, error, count } = await query;
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, data: data ?? [], count: count ?? (data?.length ?? 0) };
}

/**
 * The distinct statuses that at least one quote currently has, in canonical
 * lifecycle order. Drives the status filter so it only offers real choices.
 */
export async function listQuoteStatusesInUse() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("quotes").select("status");
  if (error) return { ok: false as const, error: error.message };
  const present = new Set((data ?? []).map((r) => r.status as QuoteStatus));
  return { ok: true as const, data: QUOTE_STATUSES.filter((s) => present.has(s)) };
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
