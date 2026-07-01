/**
 * PreviewStep.tsx — step 3: show the resolved preview and commit clean rows.
 *
 * What:        Calls previewImport for the per-row outcome, lets the user pick
 *              which repeated descriptions to promote to catalog products, then
 *              calls commitImport (transactional). Error rows are shown and are
 *              skipped by the commit.
 * Where used:  ImportWizard.
 */
"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { previewImport, commitImport } from "@/actions/import";
import type { ColumnMapping, ImportPreview, ImportTarget, SheetTable } from "@/lib/import/types";

const STATUS_STYLE: Record<string, string> = {
  create: "text-primary",
  link: "text-muted-foreground",
  warning: "text-amber-600",
  error: "text-destructive",
};

export function PreviewStep({
  target,
  table,
  mapping,
  onBack,
  onDone,
}: {
  target: ImportTarget;
  table: SheetTable;
  mapping: ColumnMapping;
  onBack: () => void;
  onDone: () => void;
}) {
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [promote, setPromote] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // State is reset via the async callback only (never synchronously in the
    // effect body) so we don't trigger cascading renders. PreviewStep mounts
    // fresh when the wizard enters step 3, so preview/error start null already.
    let active = true;
    previewImport(target, table, mapping).then((res) => {
      if (!active) return;
      if (res.ok) {
        setPreview(res.preview);
        setError(null);
      } else {
        setError(res.error);
      }
    });
    return () => {
      active = false;
    };
  }, [target, table, mapping]);

  if (error) return <p className="text-sm text-destructive">Could not build preview: {error}</p>;
  if (!preview) return <p className="text-sm text-muted-foreground">Building preview…</p>;

  const { summary } = preview;

  async function onCommit() {
    setBusy(true);
    const res = await commitImport(target, table, mapping, [...promote]);
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    onDone();
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border bg-muted/30 p-4 text-sm">
        {summary.total} rows &rarr; {summary.newClients} new clients, {summary.newProducts} new
        products, {summary.quotes} quotes.{" "}
        {summary.errors > 0 && (
          <span className="text-destructive">
            {summary.errors} {summary.errors === 1 ? "row has" : "rows have"} errors and will be
            skipped.
          </span>
        )}
      </div>

      {preview.promotions.length > 0 && (
        <div className="space-y-2 rounded-lg border p-4">
          <p className="text-sm font-medium">Repeated line items — make these catalog products?</p>
          {preview.promotions.map((p) => (
            <label key={p.description} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={promote.has(p.description)}
                onChange={(e) => {
                  const next = new Set(promote);
                  if (e.target.checked) next.add(p.description);
                  else next.delete(p.description);
                  setPromote(next);
                }}
              />
              &quot;{p.description}&quot; — {p.occurrences} rows across {p.clientCount} clients
            </label>
          ))}
        </div>
      )}

      <div className="max-h-96 overflow-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Row</TableHead>
              <TableHead className="w-24">Status</TableHead>
              <TableHead>Detail</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {preview.rows.map((r) => (
              <TableRow key={r.rowIndex}>
                <TableCell className="tabular-nums text-muted-foreground">
                  {r.rowIndex + 2}
                </TableCell>
                <TableCell className={STATUS_STYLE[r.status] ?? "text-foreground"}>
                  {r.status}
                </TableCell>
                <TableCell className="text-muted-foreground">{r.message}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onCommit} disabled={busy || summary.importable === 0}>
          {busy ? "Importing…" : `Import ${summary.importable} ${summary.importable === 1 ? "row" : "rows"}`}
        </Button>
      </div>
    </div>
  );
}
