/**
 * MapColumnsStep.tsx — step 2: map sheet headers to target fields.
 *
 * What:        One styled Select per target field, choosing which uploaded
 *              column feeds it (auto-mapped by header name), with a live sample
 *              of the first row's value. Required fields must be mapped to continue.
 * Where used:  ImportWizard.
 */
"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TARGET_FIELDS } from "@/lib/import/targets";
import type { ColumnMapping, ImportTarget, SheetTable } from "@/lib/import/types";

const eyebrow = "text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground";
const NONE = "__none__";

export function MapColumnsStep({
  target,
  table,
  mapping,
  onChange,
  onBack,
  onNext,
}: {
  target: ImportTarget;
  table: SheetTable;
  mapping: ColumnMapping;
  onChange: (m: ColumnMapping) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const fields = TARGET_FIELDS[target];
  const missingRequired = fields.filter(
    (f) => f.required && (mapping[f.key] === null || mapping[f.key] === undefined),
  );

  const items = [
    { value: NONE, label: "— Not mapped —" },
    ...table.headers.map((h, i) => ({ value: String(i), label: h || `Column ${i + 1}` })),
  ];

  function setField(key: string, value: string | null) {
    onChange({ ...mapping, [key]: value === null || value === NONE ? null : Number(value) });
  }

  return (
    <section className="space-y-6 rounded-2xl border bg-card p-6 shadow-sm">
      <div className="space-y-1">
        <p className={eyebrow}>Map your columns</p>
        <p className="text-sm text-muted-foreground">
          We matched your columns automatically — adjust any that are off. Required fields are marked
          with an asterisk.
        </p>
      </div>

      <div className="divide-y">
        {fields.map((f) => {
          const idx = mapping[f.key];
          const sample = idx !== null && idx !== undefined ? (table.rows[0]?.[idx] ?? "").trim() : "";
          return (
            <div key={f.key} className="grid grid-cols-[1fr_1.5fr] items-center gap-4 py-3 first:pt-0">
              <Label className="text-sm font-medium">
                {f.label}
                {f.required && <span className="text-destructive"> *</span>}
              </Label>
              <div className="space-y-1">
                <Select
                  items={items}
                  value={idx === null || idx === undefined ? NONE : String(idx)}
                  onValueChange={(v) => setField(f.key, v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {items.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {sample && (
                  <p className="truncate px-1 text-xs text-muted-foreground">
                    e.g. &ldquo;{sample}&rdquo;
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {missingRequired.length > 0 && (
        <p className="text-sm text-destructive">
          Map these required fields to continue: {missingRequired.map((f) => f.label).join(", ")}.
        </p>
      )}

      <div className="flex justify-between border-t pt-5">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onNext} disabled={missingRequired.length > 0}>
          Preview
        </Button>
      </div>
    </section>
  );
}
