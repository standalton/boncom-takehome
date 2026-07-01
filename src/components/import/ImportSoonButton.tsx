/**
 * ImportSoonButton.tsx — a "coming soon" teaser for spreadsheet import.
 *
 * What:        An Import button tagged "Coming soon" that, when clicked, toasts
 *              a short note about the upcoming feature. Shown on the list pages
 *              to signal the roadmap.
 * Where used:  Quotes, Clients, and Products list headers.
 * Notes:       The import feature is actually complete and lives at /import — it
 *              is kept off the live demo path on purpose. To ship it, swap this
 *              for a <Link href="/import?target=..."> using the same buttonVariants.
 */
"use client";

import { Upload } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function ImportSoonButton() {
  return (
    <button
      type="button"
      onClick={() =>
        toast("Spreadsheet import is coming soon", {
          description: "Bulk-create clients, products, and quotes from a CSV or Excel file.",
        })
      }
      className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-2")}
    >
      <Upload className="size-4" />
      Import
      <Badge variant="secondary" className="font-normal">
        Coming soon
      </Badge>
    </button>
  );
}
