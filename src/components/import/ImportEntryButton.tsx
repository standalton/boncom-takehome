/**
 * ImportEntryButton.tsx — "Import" link shown on the list pages.
 *
 * What:        Deep-links to the import wizard pre-targeted to the entity of the
 *              page it sits on.
 * Where used:  Quotes, Clients, and Products list headers.
 */
import Link from "next/link";
import { Upload } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import type { ImportTarget } from "@/lib/import/types";

export function ImportEntryButton({ target }: { target: ImportTarget }) {
  return (
    <Link href={`/import?target=${target}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
      <Upload className="size-4" />
      Import
    </Link>
  );
}
