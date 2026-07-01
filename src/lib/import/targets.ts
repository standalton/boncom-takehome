/**
 * targets.ts — per-target field definitions and row→record mapping.
 *
 * What:        Declares which fields each import target (clients, products,
 *              quotes) consumes, auto-maps sheet headers to those fields by
 *              alias, and turns one mapped row into a validated record (or a
 *              row error). The three "importers" are these three configs.
 * Where used:  The mapping UI (field list + autoMap) and previewImport (buildRecord).
 * Notes:       Validation reuses lib/validation rules and parse-money; no
 *              parallel logic. A record builder returns { ok:false, error } for a
 *              bad row rather than throwing — the preview shows every bad row.
 */
import type { ColumnMapping, FieldDef, ImportTarget } from "./types";
import { parseMoneyToCents } from "./parse-money";
import { isProductUnit } from "@/lib/product-units";
import { lineItemObject } from "@/lib/validation";

export const TARGET_FIELDS: Record<ImportTarget, FieldDef[]> = {
  clients: [
    { key: "company", label: "Company", required: true, aliases: ["company", "client", "name"] },
    {
      key: "contactName",
      label: "Contact name",
      required: false,
      aliases: ["contact", "contact name", "contact_name"],
    },
    { key: "email", label: "Email", required: false, aliases: ["email", "e-mail"] },
    { key: "phone", label: "Phone", required: false, aliases: ["phone", "tel", "telephone"] },
  ],
  products: [
    { key: "name", label: "Name", required: true, aliases: ["name", "product", "service"] },
    {
      key: "description",
      label: "Description",
      required: false,
      aliases: ["description", "desc", "details"],
    },
    {
      key: "rate",
      label: "Default rate",
      required: true,
      aliases: ["rate", "price", "default rate", "cost"],
    },
    { key: "unit", label: "Unit", required: false, aliases: ["unit", "billing unit", "per"] },
  ],
  quotes: [
    { key: "client", label: "Client", required: true, aliases: ["client", "company", "customer"] },
    {
      key: "quote",
      label: "Quote (group)",
      required: false,
      aliases: ["quote", "estimate", "quote number", "project"],
    },
    {
      key: "description",
      label: "Description",
      required: true,
      aliases: ["description", "item", "line item", "desc"],
    },
    { key: "quantity", label: "Quantity", required: true, aliases: ["qty", "quantity", "hours", "units"] },
    { key: "rate", label: "Rate", required: true, aliases: ["rate", "price", "unit price", "cost"] },
  ],
};

export function autoMap(target: ImportTarget, headers: string[]): ColumnMapping {
  const lowered = headers.map((h) => h.trim().toLowerCase());
  const mapping: ColumnMapping = {};
  for (const field of TARGET_FIELDS[target]) {
    const idx = lowered.findIndex((h) => field.aliases.includes(h));
    mapping[field.key] = idx === -1 ? null : idx;
  }
  return mapping;
}

export type RecordResult<T> = { ok: true; record: T } | { ok: false; error: string };

// Read a mapped field from a row, trimmed; '' when the field is unmapped/absent.
export function cell(row: string[], mapping: ColumnMapping, key: string): string {
  const idx = mapping[key];
  if (idx === null || idx === undefined) return "";
  return (row[idx] ?? "").trim();
}

const emailOk = (v: string) => !v || /.+@.+\..+/.test(v);

export interface ClientRecord {
  company: string;
  contactName: string;
  email: string;
  phone: string;
}

export function buildClientRecord(row: string[], mapping: ColumnMapping): RecordResult<ClientRecord> {
  const company = cell(row, mapping, "company");
  if (!company) return { ok: false, error: "Company is required" };
  const email = cell(row, mapping, "email");
  if (!emailOk(email)) return { ok: false, error: "Email is not valid" };
  return {
    ok: true,
    record: {
      company,
      contactName: cell(row, mapping, "contactName"),
      email,
      phone: cell(row, mapping, "phone"),
    },
  };
}

export interface ProductRecord {
  name: string;
  description: string;
  defaultRateCents: number;
  unit: string;
}

export function buildProductRecord(
  row: string[],
  mapping: ColumnMapping,
): RecordResult<ProductRecord> {
  const name = cell(row, mapping, "name");
  if (!name) return { ok: false, error: "Name is required" };
  const rate = parseMoneyToCents(cell(row, mapping, "rate"));
  if (!rate.ok) return { ok: false, error: rate.error.replace(/^Rate/, "Default rate") };
  const unit = cell(row, mapping, "unit");
  if (unit && !isProductUnit(unit)) return { ok: false, error: `Unknown unit "${unit}"` };
  return {
    ok: true,
    record: {
      name,
      description: cell(row, mapping, "description"),
      defaultRateCents: rate.cents,
      unit,
    },
  };
}

export interface QuoteLineRecord {
  client: string;
  quoteGroup: string; // "" = group by client
  description: string;
  quantity: number;
  rateCents: number;
}

// Reuse the shared line-item field rules (validation.ts) rather than re-deriving
// them, so the importer and the editor can never disagree on what a valid line is.
const importLineSchema = lineItemObject.pick({
  description: true,
  quantity: true,
  rateCents: true,
});

export function buildQuoteLineRecord(
  row: string[],
  mapping: ColumnMapping,
): RecordResult<QuoteLineRecord> {
  const client = cell(row, mapping, "client");
  if (!client) return { ok: false, error: "Client is required" };
  const rate = parseMoneyToCents(cell(row, mapping, "rate"));
  if (!rate.ok) return { ok: false, error: rate.error };
  const qtyRaw = cell(row, mapping, "quantity");
  const quantity = Number(qtyRaw.replace(/,/g, ""));
  if (Number.isNaN(quantity)) return { ok: false, error: "Quantity is not a number" };
  const parsed = importLineSchema.safeParse({
    description: cell(row, mapping, "description"),
    quantity,
    rateCents: rate.cents,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  return {
    ok: true,
    record: {
      client,
      quoteGroup: cell(row, mapping, "quote"),
      description: parsed.data.description,
      quantity,
      rateCents: rate.cents,
    },
  };
}
