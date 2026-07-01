/**
 * MapColumnsStep.tsx — step 2: map sheet headers to target fields.
 *
 * What:        For each target field, a dropdown selects which uploaded column
 *              feeds it (auto-mapped by header name). Required fields must be
 *              mapped before continuing.
 * Where used:  ImportWizard.
 */
"use client";

import { Button } from "@/components/ui/button";
import { TARGET_FIELDS } from "@/lib/import/targets";
import type { ColumnMapping, ImportTarget, SheetTable } from "@/lib/import/types";

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

  function setField(key: string, value: string) {
    onChange({ ...mapping, [key]: value === "" ? null : Number(value) });
  }

  return (
    <div className="space-y-5 rounded-xl border p-6">
      <p className="text-sm text-muted-foreground">
        Match your spreadsheet columns to the fields we need. Required fields are marked with an
        asterisk.
      </p>
      <div className="space-y-3">
        {fields.map((f) => (
          <div key={f.key} className="grid grid-cols-2 items-center gap-4">
            <label className="text-sm" htmlFor={`map-${f.key}`}>
              {f.label}
              {f.required && <span className="text-destructive"> *</span>}
            </label>
            <select
              id={`map-${f.key}`}
              className="rounded-md border px-2 py-1 text-sm"
              value={mapping[f.key] ?? ""}
              onChange={(e) => setField(f.key, e.target.value)}
            >
              <option value="">— not mapped —</option>
              {table.headers.map((h, i) => (
                <option key={i} value={i}>
                  {h || `Column ${i + 1}`}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
      {missingRequired.length > 0 && (
        <p className="text-sm text-destructive">
          Map these required fields to continue: {missingRequired.map((f) => f.label).join(", ")}.
        </p>
      )}
      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onNext} disabled={missingRequired.length > 0}>
          Preview
        </Button>
      </div>
    </div>
  );
}
