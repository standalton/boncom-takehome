/**
 * UploadStep.tsx — step 1: choose the entity and upload a CSV/XLSX file.
 *
 * What:        Target picker (tiles) + a drag-and-drop dropzone. Posts the file
 *              to the parseUpload server action; on success hands the parsed
 *              SheetTable up to the wizard. Surfaces parse errors via a toast.
 * Where used:  ImportWizard.
 */
"use client";

import { useRef, useState } from "react";
import { FileText, Users, Package, UploadCloud, FileSpreadsheet, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { parseUpload } from "@/actions/import";
import { DownloadTemplate } from "./DownloadTemplate";
import type { ImportTarget, SheetTable } from "@/lib/import/types";

const TARGETS: { value: ImportTarget; label: string; hint: string; icon: typeof FileText }[] = [
  { value: "quotes", label: "Quotes", hint: "Line items become draft quotes. Creates clients as needed.", icon: FileText },
  { value: "clients", label: "Clients", hint: "Companies and their contact details.", icon: Users },
  { value: "products", label: "Products", hint: "Reusable services for your catalog.", icon: Package },
];

export function UploadStep({
  target,
  onParsed,
}: {
  target: ImportTarget;
  onParsed: (target: ImportTarget, table: SheetTable) => void;
}) {
  const [selected, setSelected] = useState<ImportTarget>(target);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) setFile(dropped);
  }

  async function onContinue() {
    if (!file) {
      toast.error("Choose a file to import.");
      return;
    }
    const form = new FormData();
    form.set("file", file);
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
    <Card>
      <CardHeader>
        <CardTitle>What are you importing?</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-3">
          {TARGETS.map(({ value, label, hint, icon: Icon }) => {
            const active = selected === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setSelected(value)}
                aria-pressed={active}
                className={cn(
                  "flex flex-col gap-1.5 rounded-lg border p-3 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                  active
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-input hover:border-primary/40 hover:bg-muted/50",
                )}
              >
                <Icon className={cn("size-4", active ? "text-primary" : "text-muted-foreground")} />
                <span className="text-sm font-medium">{label}</span>
                <span className="text-xs text-muted-foreground">{hint}</span>
              </button>
            );
          })}
        </div>

        <div className="space-y-2">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 py-10 text-center transition-colors",
              dragging ? "border-primary bg-primary/5" : "border-input hover:bg-muted/40",
            )}
          >
            {file ? (
              <>
                <FileSpreadsheet className="size-6 text-primary" />
                <span className="flex items-center gap-2 text-sm font-medium">
                  {file.name}
                  <button
                    type="button"
                    aria-label="Remove file"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                      if (inputRef.current) inputRef.current.value = "";
                    }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-4" />
                  </button>
                </span>
                <span className="text-xs text-muted-foreground">Click to choose a different file</span>
              </>
            ) : (
              <>
                <UploadCloud className="size-6 text-muted-foreground" />
                <span className="text-sm font-medium">Drag a file here, or click to browse</span>
                <span className="text-xs text-muted-foreground">CSV or Excel (.csv, .xlsx)</span>
              </>
            )}
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="flex justify-end">
            <DownloadTemplate target={selected} />
          </div>
        </div>
      </CardContent>
      <CardFooter className="justify-end">
        <Button onClick={onContinue} disabled={busy || !file}>
          {busy ? "Reading…" : "Continue"}
        </Button>
      </CardFooter>
    </Card>
  );
}
