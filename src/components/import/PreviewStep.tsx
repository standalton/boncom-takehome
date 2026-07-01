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

const eyebrow = "text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground";

const STATUS_BADGE: Record<
  RowStatus,
  { variant: "default" | "secondary" | "outline" | "destructive"; className?: string }
> = {
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
      <section className="rounded-2xl border bg-card p-6 text-sm text-destructive shadow-sm">
        Could not build preview: {error}
      </section>
    );
  if (!preview)
    return (
      <section className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground shadow-sm">
        Building preview…
      </section>
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
    <section className="space-y-6 rounded-2xl border bg-card p-6 shadow-sm">
      <p className={eyebrow}>Review &amp; import</p>

      <div className="flex flex-wrap gap-3">
        {stats.map((s) => (
          <div key={s.label} className="min-w-24 rounded-xl border bg-muted/30 px-4 py-3">
            <div className="text-2xl font-semibold tabular-nums text-foreground">{s.value}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
        {summary.errors > 0 && (
          <div className="min-w-24 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3">
            <div className="text-2xl font-semibold tabular-nums text-destructive">{summary.errors}</div>
            <div className="mt-0.5 text-xs text-destructive">Skipped</div>
          </div>
        )}
      </div>

      {preview.promotions.length > 0 && (
        <div className="space-y-2 rounded-xl border bg-accent/30 p-4">
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

      <div className="max-h-96 overflow-auto rounded-xl border">
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

      <div className="flex justify-between border-t pt-5">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onCommit} disabled={busy || summary.importable === 0}>
          {busy
            ? "Importing…"
            : `Import ${summary.importable} ${summary.importable === 1 ? "row" : "rows"}`}
        </Button>
      </div>
    </section>
  );
}
