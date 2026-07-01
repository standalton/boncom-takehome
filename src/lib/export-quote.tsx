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
import type { QuoteStatus } from "@/lib/types";
import type { ClientOption } from "@/lib/client-option";
import { statusMeta } from "@/components/StatusSelect";
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

type EditorLineLite = {
  description: string;
  quantity: number;
  rateCents: number;
};

function prettyDate(iso: string) {
  return iso
    ? new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";
}

/** Assemble the current editor state into a PDF and download it. */
export async function exportQuoteFromEditor(params: {
  number: string;
  status: QuoteStatus;
  validUntil: string;
  client?: ClientOption;
  lines: EditorLineLite[];
  lineNets: number[];
  taxRatePercent: number;
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
}) {
  await exportQuotePdf({
    number: params.number,
    statusLabel: statusMeta[params.status].label,
    issuedOn: prettyDate(new Date().toISOString().slice(0, 10)),
    validUntil: prettyDate(params.validUntil),
    client: params.client
      ? {
          company: params.client.company,
          contactName: params.client.contactName,
          email: params.client.email,
          phone: params.client.phone,
        }
      : undefined,
    lines: params.lines.map((l, i) => ({
      description: l.description,
      quantity: l.quantity,
      rateCents: l.rateCents,
      lineNetCents: params.lineNets[i] ?? 0,
    })),
    subtotalCents: params.subtotalCents,
    discountCents: params.discountCents,
    taxCents: params.taxCents,
    totalCents: params.totalCents,
    taxRatePercent: params.taxRatePercent,
  });
}
