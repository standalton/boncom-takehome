/**
 * import.ts — spreadsheet import server actions.
 *
 * What:        parseUpload (untrusted file → SheetTable, size/row capped),
 *              previewImport (resolve against the DB + validate → ImportPreview),
 *              and commitImport (build the plan → transactional import_commit RPC).
 * Where used:  The import wizard (src/components/import/*).
 * Notes:       Parsing runs server-side on the upload (trust boundary): reject
 *              unknown types, cap size (2 MB) and rows (1000). Preview and commit
 *              reuse the pure functions in src/lib/import/*; totals are recomputed
 *              here via lib/pricing so the client total is never trusted.
 */
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { computeTotals } from "@/lib/pricing";
import { parseCsv, parseXlsx, toTable } from "@/lib/import/parse";
import { buildPreview, matchExisting, normalizeKey, type ExistingKey } from "@/lib/import/resolve";
import { buildClientRecord, buildProductRecord, buildQuoteLineRecord } from "@/lib/import/targets";
import type {
  ColumnMapping,
  CommitQuote,
  ImportPlan,
  ImportTarget,
  SheetTable,
} from "@/lib/import/types";

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const MAX_ROWS = 1000;
const PROMOTION_THRESHOLD = 3;

export async function parseUpload(formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false as const, error: "No file was uploaded." };
  if (file.size === 0) return { ok: false as const, error: "The file is empty." };
  if (file.size > MAX_BYTES) return { ok: false as const, error: "File is too large (max 2 MB)." };

  const name = file.name.toLowerCase();
  const isCsv = name.endsWith(".csv");
  const isXlsx = name.endsWith(".xlsx");
  if (!isCsv && !isXlsx) return { ok: false as const, error: "Upload a .csv or .xlsx file." };

  try {
    let rows: string[][];
    if (isCsv) {
      rows = parseCsv(await file.text());
    } else {
      rows = await parseXlsx(Buffer.from(await file.arrayBuffer()));
    }
    const table = toTable(rows);
    if (table.rows.length > MAX_ROWS) {
      return {
        ok: false as const,
        error: `Too many rows (max ${MAX_ROWS}). Split the file and try again.`,
      };
    }
    return { ok: true as const, table };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Could not read the file." };
  }
}

// Load existing clients/products for exact-match resolution. Surfaces DB errors
// rather than treating a failed query as "no existing records" — resolving
// against a silently-empty set would create duplicates of everything.
async function loadExisting(): Promise<{ clients: ExistingKey[]; products: ExistingKey[] }> {
  const supabase = await createClient();
  const [clientsRes, productsRes] = await Promise.all([
    supabase.from("clients").select("id, company"),
    supabase.from("products").select("id, name").eq("active", true),
  ]);
  if (clientsRes.error) throw new Error(clientsRes.error.message);
  if (productsRes.error) throw new Error(productsRes.error.message);
  return {
    clients: (clientsRes.data ?? []).map((c) => ({
      id: c.id as string,
      key: normalizeKey(c.company as string),
    })),
    products: (productsRes.data ?? []).map((p) => ({
      id: p.id as string,
      key: normalizeKey(p.name as string),
    })),
  };
}

export async function previewImport(
  target: ImportTarget,
  table: SheetTable,
  mapping: ColumnMapping,
) {
  try {
    const { clients, products } = await loadExisting();
    const preview = buildPreview({
      target,
      rows: table.rows,
      mapping,
      existingClients: clients,
      existingProducts: products,
      promotionThreshold: PROMOTION_THRESHOLD,
    });
    return { ok: true as const, preview };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Could not build preview." };
  }
}

// Build the ImportPlan from the sheet + mapping + the user's promotion choices,
// then commit it atomically. Only rows that validate are included; totals are
// computed here (tax 0, no discount) via lib/pricing. `promoteDescriptions` are
// the line descriptions the user opted to turn into catalog products.
export async function commitImport(
  target: ImportTarget,
  table: SheetTable,
  mapping: ColumnMapping,
  promoteDescriptions: string[] = [],
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "You must be signed in to import." };

  const { clients, products } = await loadExisting();
  const plan: ImportPlan = { newClients: [], newProducts: [], quotes: [] };

  // Temp-id allocators keyed by normalized name so a repeated name reuses one temp id.
  const clientTemp = new Map<string, string>();
  const productTemp = new Map<string, string>();
  const ensureClientTemp = (company: string) => {
    const key = normalizeKey(company);
    const existing = matchExisting(company, clients);
    if (existing) return { clientId: existing, clientTempId: null };
    if (!clientTemp.has(key)) {
      const tempId = `c${clientTemp.size}`;
      clientTemp.set(key, tempId);
      plan.newClients.push({
        tempId,
        company: company.trim(),
        contactName: null,
        email: null,
        phone: null,
      });
    }
    return { clientId: null, clientTempId: clientTemp.get(key)! };
  };
  const promoteSet = new Set(promoteDescriptions.map(normalizeKey));
  const ensureProductTemp = (description: string, rateCents: number) => {
    const key = normalizeKey(description);
    if (!promoteSet.has(key)) return { productId: null, productTempId: null };
    const existing = matchExisting(description, products);
    if (existing) return { productId: existing, productTempId: null };
    if (!productTemp.has(key)) {
      const tempId = `p${productTemp.size}`;
      productTemp.set(key, tempId);
      plan.newProducts.push({
        tempId,
        name: description.trim(),
        description: null,
        defaultRateCents: rateCents,
        unit: null,
      });
    }
    return { productId: null, productTempId: productTemp.get(key)! };
  };

  if (target === "clients") {
    for (const row of table.rows) {
      const built = buildClientRecord(row, mapping);
      if (!built.ok) continue; // errors were shown in the preview; skip them
      const r = built.record;
      if (matchExisting(r.company, clients)) continue; // linking an existing client is a no-op
      plan.newClients.push({
        tempId: `c${plan.newClients.length}`,
        company: r.company,
        contactName: r.contactName || null,
        email: r.email || null,
        phone: r.phone || null,
      });
    }
  } else if (target === "products") {
    for (const row of table.rows) {
      const built = buildProductRecord(row, mapping);
      if (!built.ok) continue;
      const r = built.record;
      if (matchExisting(r.name, products)) continue;
      plan.newProducts.push({
        tempId: `p${plan.newProducts.length}`,
        name: r.name,
        description: r.description || null,
        defaultRateCents: r.defaultRateCents,
        unit: r.unit || null,
      });
    }
  } else {
    // quotes: group valid line rows into quotes, create clients/products on the fly.
    const groups = new Map<string, CommitQuote>();
    for (const row of table.rows) {
      const built = buildQuoteLineRecord(row, mapping);
      if (!built.ok) continue;
      const r = built.record;
      const clientRef = ensureClientTemp(r.client);
      const groupKey = r.quoteGroup
        ? `q:${normalizeKey(r.quoteGroup)}`
        : `c:${clientRef.clientId ?? clientRef.clientTempId}`;
      let quote = groups.get(groupKey);
      if (!quote) {
        quote = {
          ...clientRef,
          subtotalCents: 0,
          discountCents: 0,
          taxCents: 0,
          totalCents: 0,
          lineItems: [],
        };
        groups.set(groupKey, quote);
      }
      const productRef = ensureProductTemp(r.description, r.rateCents);
      quote.lineItems.push({
        description: r.description,
        quantity: r.quantity,
        rateCents: r.rateCents,
        discountType: "none",
        discountValue: 0,
        productId: productRef.productId,
        productTempId: productRef.productTempId,
        position: quote.lineItems.length,
      });
    }
    // Compute totals per quote via the shared pricing module (tax 0, no discount).
    for (const quote of groups.values()) {
      const totals = computeTotals({
        lineItems: quote.lineItems.map((li) => ({
          quantity: li.quantity,
          rateCents: li.rateCents,
          discountType: "none",
          discountValue: 0,
        })),
        orderDiscountType: "none",
        orderDiscountValue: 0,
        taxRatePercent: 0,
      });
      quote.subtotalCents = totals.subtotalCents;
      quote.discountCents = totals.discountCents;
      quote.taxCents = totals.taxCents;
      quote.totalCents = totals.totalCents;
    }
    plan.quotes = [...groups.values()];
  }

  if (!plan.newClients.length && !plan.newProducts.length && !plan.quotes.length) {
    return { ok: false as const, error: "Nothing to import — every row was empty or invalid." };
  }

  const { data, error } = await supabase.rpc("import_commit", {
    payload: plan,
    p_user_id: user.id,
  });
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/quotes");
  revalidatePath("/clients");
  revalidatePath("/products");
  revalidatePath("/");
  return {
    ok: true as const,
    result: data as { clientsCreated: number; productsCreated: number; quoteIds: string[] },
  };
}
