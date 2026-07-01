/**
 * template.ts — downloadable starter spreadsheets per import target.
 *
 * What:        A known-good example sheet for each target (clients, products,
 *              quotes): the right headers plus a couple of sample rows, and a
 *              small CSV serializer.
 * Where used:  DownloadTemplate.tsx (the "Download template" link in the wizard).
 * Notes:       Headers are chosen to match the target's auto-map aliases in
 *              targets.ts, so a downloaded template round-trips through the
 *              importer with the columns already mapped.
 */
import type { ImportTarget } from "./types";

export const IMPORT_TEMPLATES: Record<ImportTarget, { headers: string[]; rows: string[][] }> = {
  clients: {
    headers: ["Company", "Contact name", "Email", "Phone"],
    rows: [
      ["Acme Inc.", "Jane Doe", "jane@acme.com", "555-0100"],
      ["Globex", "John Roe", "john@globex.com", "555-0142"],
    ],
  },
  products: {
    headers: ["Name", "Description", "Default rate", "Unit"],
    rows: [
      ["Logo design", "Primary logo plus variations", "1200", "project"],
      ["Consulting", "Strategy session", "200", "hour"],
    ],
  },
  quotes: {
    headers: ["Client", "Quote", "Description", "Quantity", "Rate"],
    rows: [
      ["Acme Inc.", "Website refresh", "Discovery workshop", "1", "1500"],
      ["Acme Inc.", "Website refresh", "Design", "40", "150"],
      ["Globex", "Brand kit", "Logo design", "1", "1200"],
    ],
  },
};

// Minimal RFC-4180 serializer: quote a cell only if it contains a comma, quote,
// or newline, doubling any embedded quotes.
export function toCsv(headers: string[], rows: string[][]): string {
  const esc = (cell: string) => (/[",\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell);
  return [headers, ...rows].map((row) => row.map(esc).join(",")).join("\n") + "\n";
}

export function templateCsv(target: ImportTarget): string {
  const t = IMPORT_TEMPLATES[target];
  return toCsv(t.headers, t.rows);
}
