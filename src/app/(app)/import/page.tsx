/**
 * import/page.tsx — the spreadsheet import wizard route.
 *
 * What:        Hosts the client-side ImportWizard. An optional ?target= query
 *              pre-selects the entity.
 * Where used:  The /import route. Reachable by direct URL only — intentionally
 *              not linked in the nav, to keep it out of the live demo path. The
 *              feature is complete and tested; this just gates its visibility.
 */
import { ImportWizard } from "@/components/import/ImportWizard";
import type { ImportTarget } from "@/lib/import/types";

const VALID: ImportTarget[] = ["clients", "products", "quotes"];

export default async function ImportPage({
  searchParams,
}: {
  searchParams: Promise<{ target?: string }>;
}) {
  const { target } = await searchParams;
  const initial = VALID.includes(target as ImportTarget) ? (target as ImportTarget) : "quotes";
  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <div className="mb-8 border-b pb-6">
        <h1 className="mb-1 text-xl font-semibold text-primary">Import from spreadsheet</h1>
        <p className="text-sm text-muted-foreground">
          Bring clients, products, or quotes in from a CSV or Excel file. Map your columns, review
          exactly what will be created, then import.
        </p>
      </div>
      <ImportWizard initialTarget={initial} />
    </div>
  );
}
