/**
 * QuotePdf.tsx — the printable quote document.
 *
 * What:        A real, vector PDF quote built with @react-pdf/renderer's layout
 *              primitives (not a screenshot of the page): letterhead, bill-to
 *              block, a line-item table, and a totals summary.
 * Where used:  Generated on demand by lib/export-quote.ts (dynamic import) when
 *              the user exports a quote.
 * Notes:       Presentation only — it receives already-computed, already-
 *              formatted data so it stays deterministic. Brand colours match the
 *              Boncom palette (navy + cyan).
 */
import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { formatCents } from "@/lib/money";

const NAVY = "#002042";
const CYAN = "#65c6d9";
const MUTED = "#6b7280";
const BORDER = "#e5e7eb";

export type QuoteExportLine = {
  description: string;
  quantity: number;
  rateCents: number;
  lineNetCents: number;
};

const lineGross = (line: QuoteExportLine) => Math.round(line.quantity * line.rateCents);
const lineDiscount = (line: QuoteExportLine) => Math.max(0, lineGross(line) - line.lineNetCents);

export type QuoteExportData = {
  number: string;
  statusLabel: string;
  issuedOn: string;
  validUntil: string;
  client?: { company: string; contactName: string | null; email: string | null; phone: string | null };
  lines: QuoteExportLine[];
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
  taxRatePercent: number;
};

const styles = StyleSheet.create({
  page: { paddingVertical: 44, paddingHorizontal: 48, fontSize: 10, color: "#1f2937", fontFamily: "Helvetica" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  brand: { fontSize: 20, fontFamily: "Helvetica-Bold", color: NAVY },
  brandSub: { fontSize: 9, color: MUTED, marginTop: 3 },
  docMeta: { alignItems: "flex-end" },
  docLabel: { fontSize: 9, letterSpacing: 2, color: MUTED, fontFamily: "Helvetica-Bold" },
  docNumber: { fontSize: 18, color: NAVY, marginTop: 2, fontFamily: "Helvetica-Bold" },
  rule: { borderBottomWidth: 2, borderBottomColor: CYAN, marginTop: 16, marginBottom: 18 },
  columns: { flexDirection: "row", justifyContent: "space-between", marginBottom: 22 },
  col: { width: "48%" },
  blockLabel: { fontSize: 8, letterSpacing: 1.5, color: MUTED, fontFamily: "Helvetica-Bold", marginBottom: 5 },
  strong: { fontFamily: "Helvetica-Bold", color: NAVY, fontSize: 11 },
  line: { color: "#374151", marginTop: 2 },
  metaPair: { flexDirection: "row", justifyContent: "space-between", marginTop: 3 },
  metaKey: { color: MUTED },
  tHead: { flexDirection: "row", backgroundColor: NAVY, color: "#ffffff", paddingVertical: 7, paddingHorizontal: 8, fontFamily: "Helvetica-Bold", fontSize: 9 },
  tRow: { flexDirection: "row", paddingVertical: 8, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: BORDER },
  cDesc: { width: "40%" },
  cQty: { width: "10%", textAlign: "right" },
  cRate: { width: "17%", textAlign: "right" },
  cDisc: { width: "16%", textAlign: "right", color: MUTED },
  cAmt: { width: "17%", textAlign: "right" },
  totals: { marginTop: 18, alignSelf: "flex-end", width: "45%" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  grandRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 6, paddingTop: 8, borderTopWidth: 2, borderTopColor: NAVY },
  grandLabel: { fontFamily: "Helvetica-Bold", color: NAVY, fontSize: 12 },
  grandValue: { fontFamily: "Helvetica-Bold", color: NAVY, fontSize: 14 },
  footer: { position: "absolute", bottom: 32, left: 48, right: 48, borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 10, fontSize: 8, color: MUTED, textAlign: "center" },
});

export function QuotePdf({ data }: { data: QuoteExportData }) {
  return (
    <Document title={`Quote ${data.number}`} author="kwik-quote">
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.brand}>kwik-quote</Text>
            <Text style={styles.brandSub}>hello@kwikquote.app</Text>
          </View>
          <View style={styles.docMeta}>
            <Text style={styles.docLabel}>QUOTE</Text>
            <Text style={styles.docNumber}>{data.number}</Text>
            <Text style={[styles.line, { marginTop: 4 }]}>{data.statusLabel}</Text>
          </View>
        </View>

        <View style={styles.rule} />

        <View style={styles.columns}>
          <View style={styles.col}>
            <Text style={styles.blockLabel}>BILL TO</Text>
            <Text style={styles.strong}>{data.client?.company ?? "—"}</Text>
            {data.client?.contactName ? <Text style={styles.line}>{data.client.contactName}</Text> : null}
            {data.client?.email ? <Text style={styles.line}>{data.client.email}</Text> : null}
            {data.client?.phone ? <Text style={styles.line}>{data.client.phone}</Text> : null}
          </View>
          <View style={styles.col}>
            <Text style={styles.blockLabel}>DETAILS</Text>
            <View style={styles.metaPair}>
              <Text style={styles.metaKey}>Issued</Text>
              <Text>{data.issuedOn}</Text>
            </View>
            <View style={styles.metaPair}>
              <Text style={styles.metaKey}>Valid until</Text>
              <Text>{data.validUntil || "—"}</Text>
            </View>
          </View>
        </View>

        <View style={styles.tHead}>
          <Text style={styles.cDesc}>Description</Text>
          <Text style={styles.cQty}>Qty</Text>
          <Text style={styles.cRate}>Rate</Text>
          <Text style={styles.cDisc}>Discount</Text>
          <Text style={styles.cAmt}>Amount</Text>
        </View>
        {data.lines.map((l, i) => {
          const disc = lineDiscount(l);
          return (
            <View style={styles.tRow} key={i} wrap={false}>
              <Text style={styles.cDesc}>{l.description || "—"}</Text>
              <Text style={styles.cQty}>{l.quantity}</Text>
              <Text style={styles.cRate}>{formatCents(l.rateCents)}</Text>
              <Text style={styles.cDisc}>{disc > 0 ? `-${formatCents(disc)}` : "—"}</Text>
              <Text style={styles.cAmt}>{formatCents(l.lineNetCents)}</Text>
            </View>
          );
        })}

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={styles.metaKey}>Subtotal</Text>
            <Text>{formatCents(data.subtotalCents)}</Text>
          </View>
          {data.discountCents > 0 ? (
            <View style={styles.totalRow}>
              <Text style={styles.metaKey}>Order discount</Text>
              <Text>-{formatCents(data.discountCents)}</Text>
            </View>
          ) : null}
          <View style={styles.totalRow}>
            <Text style={styles.metaKey}>Tax ({data.taxRatePercent}%)</Text>
            <Text>{formatCents(data.taxCents)}</Text>
          </View>
          <View style={styles.grandRow}>
            <Text style={styles.grandLabel}>Total</Text>
            <Text style={styles.grandValue}>{formatCents(data.totalCents)}</Text>
          </View>
        </View>

        <Text style={styles.footer} fixed>
          Thank you for your business. This quote is valid until the date shown above.
        </Text>
      </Page>
    </Document>
  );
}
