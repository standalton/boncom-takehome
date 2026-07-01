/**
 * UploadStep.tsx — step 1: choose the entity and upload a CSV/XLSX file.
 *
 * What:        Posts the file to the parseUpload server action; on success hands
 *              the parsed SheetTable up to the wizard. Surfaces parse errors.
 * Where used:  ImportWizard.
 */
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { parseUpload } from "@/actions/import";
import type { ImportTarget, SheetTable } from "@/lib/import/types";

const TARGETS: [ImportTarget, string][] = [
  ["quotes", "Quotes — line items become draft quotes (creates clients too)"],
  ["clients", "Clients"],
  ["products", "Products"],
];

export function UploadStep({
  target,
  onParsed,
}: {
  target: ImportTarget;
  onParsed: (target: ImportTarget, table: SheetTable) => void;
}) {
  const [selected, setSelected] = useState<ImportTarget>(target);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    const res = await parseUpload(form);
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    onParsed(selected, res.table);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-xl border p-6">
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">What are you importing?</legend>
        <div className="flex flex-col gap-2">
          {TARGETS.map(([value, label]) => (
            <label key={value} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="target"
                value={value}
                checked={selected === value}
                onChange={() => setSelected(value)}
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="file">
          File (.csv or .xlsx)
        </label>
        <input
          id="file"
          name="file"
          type="file"
          accept=".csv,.xlsx"
          required
          className="block text-sm file:mr-3 file:rounded-md file:border file:bg-muted file:px-3 file:py-1 file:text-sm"
        />
      </div>
      <Button type="submit" disabled={busy}>
        {busy ? "Reading…" : "Continue"}
      </Button>
    </form>
  );
}
