/**
 * types.ts — shared types for the spreadsheet import pipeline.
 *
 * What:        The vocabulary every import stage speaks: which entity is being
 *              imported, the fields a target needs, how a spreadsheet column
 *              maps to a field, and the per-row preview outcome.
 * Where used:  All of src/lib/import/*, src/actions/import.ts, and the wizard.
 * Notes:       Pure types only — no DB or React imports, so the logic modules
 *              stay unit-testable in isolation.
 */
import type { DiscountType } from "@/lib/types";

export type ImportTarget = "clients" | "products" | "quotes";

// A raw parsed sheet: the header row plus the data rows, all as strings.
export interface SheetTable {
  headers: string[];
  rows: string[][];
}

// One field a target can consume from the sheet.
export interface FieldDef {
  key: string; // stable identifier, e.g. "quantity"
  label: string; // shown in the mapping UI, e.g. "Quantity"
  required: boolean;
  // Header names we auto-map from (lowercased), e.g. ["qty", "quantity"].
  aliases: string[];
}

// Chosen mapping: field key -> column index in the sheet (or null = unmapped).
export type ColumnMapping = Record<string, number | null>;

export type RowStatus = "create" | "link" | "warning" | "error";

// One row after resolution + validation, ready to render in the preview.
export interface PreviewRow {
  rowIndex: number; // 0-based index into SheetTable.rows
  status: RowStatus;
  // Human-readable outcome, e.g. "New client 'Acme Corp'" or the error reason.
  message: string;
  // The normalized values pulled from the row (for display), keyed by field.
  values: Record<string, string>;
}

// A product-promotion suggestion (repeated line description across clients).
export interface PromotionSuggestion {
  description: string;
  occurrences: number;
  clientCount: number;
}

// The full preview returned to the client for a target.
export interface ImportPreview {
  target: ImportTarget;
  rows: PreviewRow[];
  promotions: PromotionSuggestion[];
  summary: {
    total: number;
    importable: number; // create + link + warning
    errors: number;
    newClients: number;
    newProducts: number;
    quotes: number;
  };
}

// ---- Commit payload (server action -> RPC) ---------------------------------

export interface NewClientPayload {
  tempId: string;
  company: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
}

export interface NewProductPayload {
  tempId: string;
  name: string;
  description: string | null;
  defaultRateCents: number;
  unit: string | null;
}

export interface CommitLineItem {
  description: string;
  quantity: number;
  rateCents: number;
  discountType: DiscountType;
  discountValue: number;
  // Exactly one of these identifies the product (or neither = ad-hoc line).
  productId: string | null;
  productTempId: string | null;
  // Zero-based order within its quote.
  position: number;
}

export interface CommitQuote {
  clientId: string | null;
  clientTempId: string | null;
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
  lineItems: CommitLineItem[];
}

// What commitImport sends to the RPC.
export interface ImportPlan {
  newClients: NewClientPayload[];
  newProducts: NewProductPayload[];
  quotes: CommitQuote[];
}
