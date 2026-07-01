/**
 * PreviewStep.tsx — step 3: show the resolved preview and commit clean rows.
 *
 * What:        Calls previewImport for the per-row outcome, shows a summary +
 *              product-promotion choices, then calls commitImport (transactional).
 *              Error rows are shown as badges and are skipped by the commit.
 * Where used:  ImportWizard.
 */
"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { previewImport, commitImport } from "@/actions/import";
import type {
  ColumnMapping,
  ImportPreview,
  ImportTarget,
  RowStatus,
  SheetTable,
} from "@/lib/import/types";

const STATUS_BADGE: Record<RowStatus, { variant: "default" | "secondary" | "outline" | "destructive"; className?: string }> = {
  create: { variant: "default" },
  link: { variant: "secondary" },
  warning: { variant: "outline", className: "border-amber-500/40 text-amber-600" },
  error: { variant: "destructive" },
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
    // effect body) so we don't trigger cascading renders.
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

  if (error)
    return (
      <Card>
        <CardContent className="pt-4 text-sm text-destructive">
          Could not build preview: {error}
        </CardContent>
      </Card>
    );
  if (!preview)
    return (
      <Card>
        <CardContent className="pt-4 text-sm text-muted-foreground">Building preview…</CardContent>
      </Card>
    );

  const { summary } = preview;
  const stats = [
    { label: "Rows", value: summary.total },
    { label: "New clients", value: summary.newClients },
    { label: "New products", value: summary.newProducts },
    { label: "Quotes", value: summary.quotes },
  ].filter((s) => s.label === "Rows" || s.value > 0);

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
    <Card>
      <CardHeader>
        <CardTitle>Review &amp; import</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap gap-2">
          {stats.map((s) => (
            <div key={s.label} className="rounded-lg border bg-muted/30 px-3 py-2">
              <div className="text-lg font-semibold tabular-nums text-foreground">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          ))}
          {summary.errors > 0 && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
              <div className="text-lg font-semibold tabular-nums text-destructive">{summary.errors}</div>
              <div className="text-xs text-destructive">Skipped (errors)</div>
            </div>
          )}
        </div>

        {preview.promotions.length > 0 && (
          <div className="space-y-2 rounded-lg border p-4">
            <p className="text-sm font-medium">Repeated line items — add these to your catalog?</p>
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
                <span>
                  &ldquo;{p.description}&rdquo;{" "}
                  <span className="text-muted-foreground">
                    — {p.occurrences} rows across {p.clientCount} clients
                  </span>
                </span>
              </label>
            ))}
          </div>
        )}

        <div className="max-h-96 overflow-auto rounded-lg border">
          <Table>
            <TableHeader className="sticky top-0 bg-card">
              <TableRow>
                <TableHead className="w-14">Row</TableHead>
                <TableHead className="w-24">Status</TableHead>
                <TableHead>Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {preview.rows.map((r) => {
                const badge = STATUS_BADGE[r.status];
                return (
                  <TableRow key={r.rowIndex}>
                    <TableCell className="tabular-nums text-muted-foreground">{r.rowIndex + 2}</TableCell>
                    <TableCell>
                      <Badge variant={badge.variant} className={badge.className}>
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{r.message}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <CardFooter className="justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onCommit} disabled={busy || summary.importable === 0}>
          {busy
            ? "Importing…"
            : `Import ${summary.importable} ${summary.importable === 1 ? "row" : "rows"}`}
        </Button>
      </CardFooter>
    </Card>
  );
}
