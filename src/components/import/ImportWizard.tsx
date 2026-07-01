/**
 * ImportWizard.tsx — client container holding the 3-step import flow's state.
 *
 * What:        Owns target, parsed table, column mapping, and preview; renders
 *              the active step. Server actions do the parsing/resolution/commit;
 *              this component only sequences the steps and holds their results.
 * Where used:  /import route.
 */
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { UploadStep } from "./UploadStep";
import { MapColumnsStep } from "./MapColumnsStep";
import { PreviewStep } from "./PreviewStep";
import { autoMap } from "@/lib/import/targets";
import type { ColumnMapping, ImportTarget, SheetTable } from "@/lib/import/types";

type Step = "upload" | "map" | "preview";

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
    <div className="max-w-4xl">
      <Steps step={step} />
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

function Steps({ step }: { step: Step }) {
  const labels: [Step, string][] = [
    ["upload", "1. Upload"],
    ["map", "2. Map columns"],
    ["preview", "3. Preview & import"],
  ];
  return (
    <ol className="mb-6 flex gap-4 text-sm">
      {labels.map(([key, label]) => (
        <li key={key} className={key === step ? "font-medium text-primary" : "text-muted-foreground"}>
          {label}
        </li>
      ))}
    </ol>
  );
}
