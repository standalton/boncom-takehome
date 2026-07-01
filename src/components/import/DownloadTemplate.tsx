/**
 * DownloadTemplate.tsx — "Download template" link for the import wizard.
 *
 * What:        Downloads a ready-to-fill CSV for the selected target (correct
 *              headers + example rows) via an in-browser Blob, no server round trip.
 * Where used:  UploadStep.
 */
"use client";

import { Download } from "lucide-react";
import { templateCsv } from "@/lib/import/template";
import type { ImportTarget } from "@/lib/import/types";

export function DownloadTemplate({ target }: { target: ImportTarget }) {
  function onDownload() {
    const blob = new Blob([templateCsv(target)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${target}-template.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={onDownload}
      className="inline-flex items-center gap-1.5 text-sm text-primary underline-offset-4 transition-opacity hover:opacity-80 hover:underline"
    >
      <Download className="size-3.5" />
      Download {target} template
    </button>
  );
}
