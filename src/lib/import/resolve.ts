/**
 * resolve.ts — entity resolution, dedup suggestions, and preview assembly.
 *
 * What:        Matches sheet values to existing records by exact normalized key
 *              (never fuzzy — a human confirms anything non-exact), suggests
 *              catalog products for line descriptions repeated across clients,
 *              and assembles the per-row ImportPreview.
 * Where used:  src/actions/import.ts (previewImport, commitImport plan build).
 * Notes:       Pure — existing records are passed in, not fetched here, so this
 *              stays unit-testable. "Exact match auto-links; the rest is a user
 *              decision" is the core resolution rule from the design.
 */
import type {
  ColumnMapping,
  ImportPreview,
  ImportTarget,
  PreviewRow,
  PromotionSuggestion,
  RowStatus,
} from "./types";
import { buildClientRecord, buildProductRecord, buildQuoteLineRecord } from "./targets";

export interface ExistingKey {
  id: string;
  key: string; // already normalized
}

export function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function matchExisting(value: string, existing: ExistingKey[]): string | null {
  const key = normalizeKey(value);
  return existing.find((e) => e.key === key)?.id ?? null;
}

// A repeated line description across multiple clients is a catalog-product
// candidate. This is a COUNT, not a confidence score — easy to explain, easy to
// get right. threshold = minimum occurrences (default 3), and it must span >=2
// distinct clients (a description used only by one client isn't reusable catalog).
export function suggestPromotions(
  lines: { description: string; client: string }[],
  threshold: number,
): PromotionSuggestion[] {
  const byDesc = new Map<string, { label: string; clients: Set<string>; count: number }>();
  for (const l of lines) {
    const key = normalizeKey(l.description);
    if (!key) continue;
    const entry = byDesc.get(key) ?? { label: l.description.trim(), clients: new Set(), count: 0 };
    entry.count += 1;
    entry.clients.add(normalizeKey(l.client));
    byDesc.set(key, entry);
  }
  const out: PromotionSuggestion[] = [];
  for (const entry of byDesc.values()) {
    if (entry.count >= threshold && entry.clients.size >= 2) {
      out.push({
        description: entry.label,
        occurrences: entry.count,
        clientCount: entry.clients.size,
      });
    }
  }
  return out.sort((a, b) => b.occurrences - a.occurrences);
}

export interface BuildPreviewInput {
  target: ImportTarget;
  rows: string[][];
  mapping: ColumnMapping;
  existingClients: ExistingKey[];
  existingProducts: ExistingKey[];
  promotionThreshold: number;
}

// Assemble a per-row preview. Bad rows become status "error" but never abort the
// batch — every row is reported so the user can fix or skip. New-entity and
// quote counts drive the summary bar.
export function buildPreview(input: BuildPreviewInput): ImportPreview {
  const { target } = input;
  if (target === "clients") return previewClients(input);
  if (target === "products") return previewProducts(input);
  return previewQuotes(input);
}

function emptySummary(total: number) {
  return { total, importable: 0, errors: 0, newClients: 0, newProducts: 0, quotes: 0 };
}

function previewClients(input: BuildPreviewInput): ImportPreview {
  const rows: PreviewRow[] = [];
  const summary = emptySummary(input.rows.length);
  input.rows.forEach((row, rowIndex) => {
    const built = buildClientRecord(row, input.mapping);
    if (!built.ok) {
      rows.push({ rowIndex, status: "error", message: built.error, values: {} });
      summary.errors += 1;
      return;
    }
    const { record } = built;
    const matchId = matchExisting(record.company, input.existingClients);
    const status: RowStatus = matchId ? "link" : "create";
    if (!matchId) summary.newClients += 1;
    summary.importable += 1;
    rows.push({
      rowIndex,
      status,
      message: matchId
        ? `Links to existing client "${record.company}"`
        : `New client "${record.company}"`,
      values: { company: record.company, email: record.email },
    });
  });
  return { target: "clients", rows, promotions: [], summary };
}

function previewProducts(input: BuildPreviewInput): ImportPreview {
  const rows: PreviewRow[] = [];
  const summary = emptySummary(input.rows.length);
  input.rows.forEach((row, rowIndex) => {
    const built = buildProductRecord(row, input.mapping);
    if (!built.ok) {
      rows.push({ rowIndex, status: "error", message: built.error, values: {} });
      summary.errors += 1;
      return;
    }
    const { record } = built;
    const matchId = matchExisting(record.name, input.existingProducts);
    const status: RowStatus = matchId ? "link" : "create";
    if (!matchId) summary.newProducts += 1;
    summary.importable += 1;
    rows.push({
      rowIndex,
      status,
      message: matchId
        ? `Matches existing product "${record.name}"`
        : `New product "${record.name}"`,
      values: { name: record.name },
    });
  });
  return { target: "products", rows, promotions: [], summary };
}

function previewQuotes(input: BuildPreviewInput): ImportPreview {
  const rows: PreviewRow[] = [];
  const summary = emptySummary(input.rows.length);
  const validLines: { description: string; client: string }[] = [];
  const quoteGroups = new Set<string>();
  const newClientKeys = new Set<string>();

  input.rows.forEach((row, rowIndex) => {
    const built = buildQuoteLineRecord(row, input.mapping);
    if (!built.ok) {
      rows.push({ rowIndex, status: "error", message: built.error, values: {} });
      summary.errors += 1;
      return;
    }
    const { record } = built;
    validLines.push({ description: record.description, client: record.client });
    // Group key: explicit quote group if present, else the client (one quote/client).
    const groupKey = record.quoteGroup
      ? `q:${normalizeKey(record.quoteGroup)}`
      : `c:${normalizeKey(record.client)}`;
    quoteGroups.add(groupKey);
    const clientMatch = matchExisting(record.client, input.existingClients);
    if (!clientMatch) newClientKeys.add(normalizeKey(record.client));
    summary.importable += 1;
    rows.push({
      rowIndex,
      status: clientMatch ? "link" : "create",
      message: clientMatch
        ? `Line for existing client "${record.client}"`
        : `Line for new client "${record.client}"`,
      values: { client: record.client, description: record.description },
    });
  });

  summary.quotes = quoteGroups.size;
  summary.newClients = newClientKeys.size;
  const promotions = suggestPromotions(validLines, input.promotionThreshold);
  return { target: "quotes", rows, promotions, summary };
}
