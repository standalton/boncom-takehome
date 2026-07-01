/**
 * quotes.ts — quote server actions.
 *
 * What:        Create, read, list, save, and change-status for quotes.
 * Where used:  The dashboard (list) and the quote editor (load + save).
 * Notes:       saveQuote re-validates with the shared Zod schema and RECOMPUTES
 *              totals server-side via lib/pricing (the client total is never
 *              trusted), stamps the editor, and appends an audit entry. Line
 *              items are replaced (delete + insert) on each save; this is a
 *              deliberate simplification (not a single transaction) acceptable
 *              for a single-editor-at-a-time internal tool.
 */
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { computeTotals } from "@/lib/pricing";
import { quoteSchema } from "@/lib/validation";
import type { QuoteStatus } from "@/lib/types";

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

export async function createQuote(clientId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("quotes")
    .insert({ client_id: clientId, created_by: user?.id, updated_by: user?.id })
    .select("id")
    .single();
  if (error) return { ok: false as const, error: error.message };
  await supabase
    .from("activity_log")
    .insert({ quote_id: data.id, user_id: user?.id, action: "created", detail: {} });
  return { ok: true as const, id: data.id as string };
}

export async function saveQuote(id: string, input: unknown) {
  const parsed = quoteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0].message };
  }
  const q = parsed.data;

  const totals = computeTotals({
    lineItems: q.lineItems.map((li) => ({
      quantity: li.quantity,
      rateCents: li.rateCents,
      discountType: li.discountType,
      discountValue: li.discountValue,
    })),
    orderDiscountType: q.orderDiscountType,
    orderDiscountValue: q.orderDiscountValue,
    taxRatePercent: q.taxRatePercent,
  });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error: upErr } = await supabase
    .from("quotes")
    .update({
      client_id: q.clientId,
      tax_rate: q.taxRatePercent,
      discount_type: q.orderDiscountType,
      discount_value: q.orderDiscountValue,
      notes: q.notes,
      valid_until: q.validUntil || null,
      subtotal_cents: totals.subtotalCents,
      discount_cents: totals.discountCents,
      tax_cents: totals.taxCents,
      total_cents: totals.totalCents,
      updated_by: user?.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (upErr) return { ok: false as const, error: upErr.message };

  const { error: delErr } = await supabase.from("line_items").delete().eq("quote_id", id);
  if (delErr) return { ok: false as const, error: delErr.message };

  if (q.lineItems.length) {
    const { error: liErr } = await supabase.from("line_items").insert(
      q.lineItems.map((li, i) => ({
        quote_id: id,
        description: li.description,
        quantity: li.quantity,
        rate_cents: li.rateCents,
        discount_type: li.discountType,
        discount_value: li.discountValue,
        position: i,
      })),
    );
    if (liErr) return { ok: false as const, error: liErr.message };
  }

  await supabase.from("activity_log").insert({
    quote_id: id,
    user_id: user?.id,
    action: "saved",
    detail: { total_cents: totals.totalCents },
  });

  revalidatePath(`/quotes/${id}`);
  revalidatePath("/");
  return { ok: true as const, totals };
}

export async function setStatus(id: string, status: QuoteStatus) {
  // Phase 1 UI exposes draft/sent; the action accepts all for the Phase 2 pipeline.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("quotes")
    .update({ status, updated_by: user?.id, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  await supabase.from("activity_log").insert({
    quote_id: id,
    user_id: user?.id,
    action: "status_changed",
    detail: { status },
  });
  revalidatePath(`/quotes/${id}`);
  revalidatePath("/");
  return { ok: true as const };
}

export async function duplicateQuote(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: src, error: readErr } = await supabase
    .from("quotes")
    .select("*, line_items(*)")
    .eq("id", id)
    .single();
  if (readErr) return { ok: false as const, error: readErr.message };

  // The new quote starts as a fresh draft; its number is auto-generated.
  const { data: created, error: insErr } = await supabase
    .from("quotes")
    .insert({
      client_id: src.client_id,
      status: "draft",
      tax_rate: src.tax_rate,
      discount_type: src.discount_type,
      discount_value: src.discount_value,
      notes: src.notes,
      valid_until: src.valid_until,
      subtotal_cents: src.subtotal_cents,
      discount_cents: src.discount_cents,
      tax_cents: src.tax_cents,
      total_cents: src.total_cents,
      created_by: user?.id,
      updated_by: user?.id,
    })
    .select("id")
    .single();
  if (insErr) return { ok: false as const, error: insErr.message };

  const items = (src.line_items ?? []).map(
    (li: {
      description: string;
      quantity: number;
      rate_cents: number;
      discount_type: string;
      discount_value: number;
      position: number;
      product_id: string | null;
    }) => ({
      quote_id: created.id,
      description: li.description,
      quantity: li.quantity,
      rate_cents: li.rate_cents,
      discount_type: li.discount_type,
      discount_value: li.discount_value,
      position: li.position,
      product_id: li.product_id,
    }),
  );
  if (items.length) {
    const { error: liErr } = await supabase.from("line_items").insert(items);
    if (liErr) return { ok: false as const, error: liErr.message };
  }

  await supabase
    .from("activity_log")
    .insert({ quote_id: created.id, user_id: user?.id, action: "created", detail: { duplicated_from: id } });

  revalidatePath("/quotes");
  revalidatePath("/");
  return { ok: true as const, id: created.id as string };
}

export async function deleteQuote(id: string) {
  const supabase = await createClient();
  // Line items and activity-log entries are removed by ON DELETE CASCADE.
  const { error } = await supabase.from("quotes").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/quotes");
  revalidatePath("/");
  return { ok: true as const };
}
