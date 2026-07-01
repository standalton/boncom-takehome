/**
 * parse.ts — spreadsheet file → SheetTable, for CSV and XLSX.
 *
 * What:        parseCsv / parseXlsx turn a file's contents into rows of string
 *              cells; toTable splits the header row from the data rows and
 *              rejects empty sheets. Both formats produce the identical shape so
 *              nothing downstream cares which was uploaded.
 * Where used:  src/actions/import.ts (parseUpload).
 * Notes:       parseXlsx is async and Node-only (read-excel-file/node); parsing
 *              runs server-side on the untrusted upload. Blank rows are dropped.
 */
import Papa from "papaparse";
import type { SheetTable } from "./types";

export function parseCsv(text: string): string[][] {
  const result = Papa.parse<string[]>(text, { skipEmptyLines: "greedy" });
  // papaparse surfaces malformed-quote issues in result.errors; fail loudly.
  const fatal = result.errors.find((e) => e.type === "Quotes" || e.type === "Delimiter");
  if (fatal) throw new Error(`CSV parse error: ${fatal.message}`);
  return (result.data as string[][]).map((row) => row.map((cell) => (cell ?? "").trim()));
}

// XLSX: read-excel-file/node returns rows of cell values (various JS types).
// We stringify every cell so the rest of the pipeline only ever sees strings,
// matching parseCsv's output exactly.
export async function parseXlsx(buffer: Buffer): Promise<string[][]> {
  const readXlsxFile = (await import("read-excel-file/node")).default;
  // The library types the result as a Sheet of cell values; treat each cell as
  // unknown and stringify, since the pipeline only consumes strings.
  const rows = (await readXlsxFile(buffer)) as unknown as unknown[][];
  return rows.map((row) =>
    row.map((cell) => (cell === null || cell === undefined ? "" : String(cell).trim())),
  );
}

export function toTable(rows: string[][]): SheetTable {
  const nonEmpty = rows.filter((r) => r.some((c) => c.trim() !== ""));
  if (nonEmpty.length === 0) throw new Error("The file is empty.");
  const [headers, ...data] = nonEmpty;
  if (data.length === 0) throw new Error("The file has a header row but no data rows.");
  return { headers: headers.map((h) => h.trim()), rows: data };
}
