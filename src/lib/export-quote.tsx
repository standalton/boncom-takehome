/**
 * export-quote.tsx — generate and download a quote PDF.
 *
 * What:        `exportQuotePdf(data)` renders the QuotePdf document to a real PDF
 *              blob and triggers a browser download named after the quote.
 * Where used:  The quote editor's Export actions (header + send dialog).
 * Notes:       @react-pdf/renderer and the document are imported dynamically so
 *              the (large) PDF engine is only loaded when a user actually
 *              exports — it never ships in the main bundle or runs on the server.
 */
import type { QuoteExportData } from "@/components/QuotePdf";

export type { QuoteExportData } from "@/components/QuotePdf";

export async function exportQuotePdf(data: QuoteExportData) {
  const [{ pdf }, { QuotePdf }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/components/QuotePdf"),
  ]);

  const blob = await pdf(<QuotePdf data={data} />).toBlob();

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${data.number || "quote"}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
