/**
 * ImportWizard.tsx — client container holding the 3-step import flow's state.
 *
 * What:        Owns target, parsed table, column mapping, and preview; renders
 *              the active step under a numbered progress indicator. Server
 *              actions do the parsing/resolution/commit; this component only
 *              sequences the steps and holds their results.
 * Where used:  /import route.
 */
"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { UploadStep } from "./UploadStep";
import { MapColumnsStep } from "./MapColumnsStep";
import { PreviewStep } from "./PreviewStep";
import { autoMap } from "@/lib/import/targets";
import type { ColumnMapping, ImportTarget, SheetTable } from "@/lib/import/types";

type Step = "upload" | "map" | "preview";

const STEPS: { key: Step; label: string }[] = [
  { key: "upload", label: "Upload" },
  { key: "map", label: "Map columns" },
  { key: "preview", label: "Preview & import" },
];

export function ImportWizard({ initialTarget }: { initialTarget: ImportTarget }) {
  const [step, setStep] = useState<Step>("upload");
  const [target, setTarget] = useState<ImportTarget>(initialTarget);
  const [table, setTable] = useState<SheetTable | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({});

  function onParsed(nextTarget: ImportTarget, parsed: SheetTable) {
    setTarget(nextTarget);
    setTable(parsed);
    setMapping(autoMap(nextTarget, parsed.headers));
    setStep("map");
  }

  return (
    <div>
      <Stepper step={step} />
      {step === "upload" && <UploadStep target={target} onParsed={onParsed} />}
      {step === "map" && table && (
        <MapColumnsStep
          target={target}
          table={table}
          mapping={mapping}
          onChange={setMapping}
          onBack={() => setStep("upload")}
          onNext={() => setStep("preview")}
        />
      )}
      {step === "preview" && table && (
        <PreviewStep
          target={target}
          table={table}
          mapping={mapping}
          onBack={() => setStep("map")}
          onDone={() => {
            toast.success("Import complete.");
            setStep("upload");
            setTable(null);
          }}
        />
      )}
    </div>
  );
}

function Stepper({ step }: { step: Step }) {
  const current = STEPS.findIndex((s) => s.key === step);
  return (
    <ol className="mb-8 flex items-center gap-2 text-sm">
      {STEPS.map((s, i) => {
        const state = i < current ? "done" : i === current ? "current" : "todo";
        return (
          <li key={s.key} className="flex items-center gap-2">
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium transition-colors",
                state === "current" && "bg-primary text-primary-foreground",
                state === "done" && "bg-primary/15 text-primary",
                state === "todo" && "bg-muted text-muted-foreground",
              )}
            >
              {state === "done" ? <Check className="size-3.5" /> : i + 1}
            </span>
            <span className={cn(state === "todo" ? "text-muted-foreground" : "font-medium text-foreground")}>
              {s.label}
            </span>
            {i < STEPS.length - 1 && <span className="mx-1 h-px w-8 bg-border" aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}
