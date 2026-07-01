/**
 * quotes.ts — quote mutation server actions.
 *
 * What:        Create, save, change-status, duplicate, and delete quotes.
 *              (Read-only queries live in actions/quote-queries.ts.)
 * Where used:  The quote editor (save / status / duplicate / delete) and the
 *              new-quote starter.
 * Notes:       saveQuote re-validates with the shared Zod schema and RECOMPUTES
 *              totals server-side via lib/pricing (the client total is never
 *              trusted), stamps the editor, and appends an audit entry. Line
 *              items are replaced (delete + insert) on each save; this is a
 *              deliberate simplification (not a single transaction) acceptable
 *              for a single-editor-at-a-time internal tool.
 *              The lock is enforced HERE, not just in the UI: saveQuote only
 *              writes to a draft and setStatus only makes transitions the
 *              lib/quote-status state machine allows (both via conditional
 *              UPDATEs). See lib/quote-status.ts.
 */
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { computeTotals } from "@/lib/pricing";
import { quoteSchema } from "@/lib/validation";
import { statusesThatCanBecome } from "@/lib/quote-status";
import { recordActivity, snapshotChanges, type PrevQuoteRow } from "@/lib/quote-audit";
import type { QuoteStatus } from "@/lib/types";

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
  await recordActivity(supabase, { quote_id: data.id, user_id: user?.id, action: "created", detail: {} });
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

  // Snapshot the prior state so the activity log can record what this save
  // actually changed. Read before the update (and before line items are replaced).
  const { data: prev, error: prevErr } = await supabase
    .from("quotes")
    .select(
      "client_id, tax_rate, discount_type, discount_value, notes, valid_until, line_items(description, quantity, rate_cents, discount_type, discount_value, position, product_id)",
    )
    .eq("id", id)
    .single();
  if (prevErr) return { ok: false as const, error: prevErr.message };

  // Draft-only guard, enforced atomically: the row updates only while its status
  // is still "draft". A locked quote matches nothing, so no rows come back and we
  // bail out before touching its line items. Do not trust the client's lock UI.
  const { data: updated, error: upErr } = await supabase
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
    .eq("id", id)
    .eq("status", "draft")
    .select("id");
  if (upErr) return { ok: false as const, error: upErr.message };
  if (!updated || updated.length === 0) {
    return {
      ok: false as const,
      error: "This quote can no longer be edited. Revert it to a draft first.",
    };
  }

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
        product_id: li.productId ?? null,
        position: i,
      })),
    );
    if (liErr) return { ok: false as const, error: liErr.message };
  }

  const changes = await snapshotChanges(supabase, prev as unknown as PrevQuoteRow, q);

  // Only record a history entry when something actually changed — a no-op save
  // shouldn't clutter the timeline.
  if (changes.length > 0) {
    await recordActivity(supabase, {
      quote_id: id,
      user_id: user?.id,
      action: "saved",
      detail: { changes, total_cents: totals.totalCents },
    });
  }

  revalidatePath(`/quotes/${id}`);
  revalidatePath("/");
  return { ok: true as const, totals };
}

export async function setStatus(id: string, status: QuoteStatus) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Enforce the lifecycle atomically: the row moves to `status` only if its
  // current status is one the state machine allows to reach it. An illegal jump
  // (e.g. draft -> paid, skipping finalize/send) matches no row and is rejected.
  const { data: updated, error } = await supabase
    .from("quotes")
    .update({ status, updated_by: user?.id, updated_at: new Date().toISOString() })
    .eq("id", id)
    .in("status", statusesThatCanBecome(status))
    .select("id");
  if (error) return { ok: false as const, error: error.message };
  if (!updated || updated.length === 0) {
    return {
      ok: false as const,
      error: `Cannot change this quote to "${status}" from its current state.`,
    };
  }
  await recordActivity(supabase, {
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

  await recordActivity(supabase, {
    quote_id: created.id,
    user_id: user?.id,
    action: "created",
    detail: { duplicated_from: id },
  });

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
