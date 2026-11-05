import { Document, Font, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { InvoiceRow } from "@/lib/invoice";

/**
 * InvoiceDocument — the Rewire tax invoice, drawn with @react-pdf/renderer.
 *
 * Follows the Wishmaster invoice layout (docs/INVOICES.md §5): header with
 * the customer and the title box, a Billing / Delivery / Sold by row, order
 * information, the item table with shipping and discount rows, then the
 * Total Payable and VAT summary box on the right (Terms beside it when an
 * admin has set any). The footer repeats on every page; item rows never
 * split across pages, and the table header repeats on each page.
 *
 * Server only. Every figure arrives already formatted by
 * `src/services/invoice.service.ts`; this file only lays them out.
 */

export interface InvoiceDocumentData {
  /** The black ink logo PNG (`brandLogo.onLight`), read by the service. */
  logo: Buffer;
  title: string;
  invoiceNumber: string;
  issueDate: string;
  orderNumber: string;
  orderDate: string;
  deliveredOn: string | null;
  customer: { name: string; lines: string[] };
  seller: { name: string; address: string; vat: string | null; email: string; website: string; supportUrl: string };
  footer: { left: string[]; right: string[]; note: string };
  taxName: string;
  ratePercent: number;
  rows: InvoiceRow[];
  delivery: InvoiceRow | null;
  discount: InvoiceRow | null;
  totals: { excl: number; vat: number; payable: number };
  payment: { method: string; status: string };
  terms: string[];
  money: (minor: number) => string;
}

/** Print palette: neutral ink, so the invoice reads the same in black and white. */
const INK = "#17191c";
const INK_SECONDARY = "#4a4f57";
const INK_MUTED = "#6b7078";
const RULE = "#e0e0e0";
const RULE_SOFT = "#f0f0f0";
const PANEL = "#f6f6f4";
const HIGHLIGHT = "#eef2f7";
/** The Rewire brand slate (`--color-accent` in globals.css): the title box and links. */
const BRAND = "#3b404b";

/** Wishmaster's columns, with money columns widened so AED 0,000.00 fits on one line. */
const COLUMNS = { description: "26%", qty: "6%", excl: "15%", rate: "8%", vat: "13%", incl: "16%", total: "16%" };

/* Never break words with hyphens: SKUs, URLs and names must print whole. */
Font.registerHyphenationCallback((word) => [word]);

const styles = StyleSheet.create({
  page: { paddingTop: 28, paddingBottom: 90, paddingHorizontal: 40, fontFamily: "Helvetica", fontSize: 9, color: INK, lineHeight: 1.4 },
  header: { flexDirection: "row", justifyContent: "space-between", paddingBottom: 12, marginBottom: 12, borderBottomWidth: 1, borderBottomColor: RULE },
  headerLeft: { maxWidth: "55%" },
  logo: { width: 110, marginBottom: 12 },
  customerName: { textTransform: "uppercase", fontFamily: "Helvetica-Bold", marginBottom: 2 },
  customerLine: { textTransform: "uppercase", marginBottom: 2 },
  muted: { color: INK_MUTED },
  titleBox: { backgroundColor: BRAND, color: "#ffffff", padding: 12, borderRadius: 4, minWidth: 190 },
  link: { color: BRAND, textDecoration: "underline" },
  titleText: { fontFamily: "Helvetica-Bold", fontSize: 14, marginBottom: 6 },
  titleLine: { marginBottom: 2 },
  bold: { fontFamily: "Helvetica-Bold" },
  addressRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: RULE, paddingBottom: 12, marginBottom: 12 },
  addressBox: { flex: 1, paddingHorizontal: 12 },
  addressBoxDivided: { flex: 1, paddingHorizontal: 12, borderLeftWidth: 1, borderLeftColor: RULE_SOFT },
  boxTitle: { fontFamily: "Helvetica-Bold", marginBottom: 5 },
  sectionTitle: { fontFamily: "Helvetica-Bold", fontSize: 10, textTransform: "uppercase", marginTop: 6, marginBottom: 6, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: RULE },
  kv: { flexDirection: "row", marginBottom: 4 },
  kvKey: { width: 100, color: INK_SECONDARY },
  table: { marginBottom: 12 },
  th: { flexDirection: "row", backgroundColor: PANEL, borderBottomWidth: 1.5, borderBottomColor: RULE, fontFamily: "Helvetica-Bold" },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: RULE_SOFT },
  cell: { paddingVertical: 6, paddingHorizontal: 5 },
  num: { textAlign: "right" },
  ctr: { textAlign: "center" },
  sku: { fontSize: 7.5, color: INK_MUTED, marginTop: 1 },
  bottom: { flexDirection: "row", justifyContent: "space-between", marginTop: 12 },
  leftCol: { width: "48%" },
  rightCol: { width: "48%" },
  box: { borderWidth: 1, borderColor: RULE, borderRadius: 4, padding: 10, marginBottom: 8 },
  summaryBox: { borderWidth: 1, borderColor: RULE, borderRadius: 4, padding: 10, backgroundColor: PANEL },
  totalLine: { flexDirection: "row", justifyContent: "space-between", fontFamily: "Helvetica-Bold", fontSize: 12, paddingBottom: 8, marginBottom: 8, borderBottomWidth: 1, borderBottomColor: RULE },
  terms: { fontSize: 7.5, color: INK_SECONDARY },
  footer: { position: "absolute", bottom: 24, left: 40, right: 40, borderTopWidth: 1, borderTopColor: RULE, paddingTop: 6, fontSize: 7, color: INK_MUTED },
  footerRow: { flexDirection: "row", justifyContent: "space-between" },
  footerNote: { fontSize: 6.5, textAlign: "center", marginTop: 4, paddingTop: 3, borderTopWidth: 0.5, borderTopColor: RULE_SOFT },
});

export function InvoiceDocument({ data }: { data: InvoiceDocumentData }) {
  const { money, taxName } = data;
  const signed = (minor: number) => (minor < 0 ? `- ${money(-minor)}` : money(minor));

  return (
    <Document title={`${data.title} ${data.invoiceNumber}`} author={data.seller.name}>
      <Page size="A4" style={styles.page}>
        {/* Footer: repeats on every page. */}
        <View fixed style={styles.footer}>
          <View style={styles.footerRow}>
            <View>
              {data.footer.left.map((line, index) => (
                <Text key={index} style={index === 0 ? styles.bold : undefined}>{line}</Text>
              ))}
            </View>
            <View style={{ alignItems: "flex-end" }}>
              {data.footer.right.map((line, index) => (
                <Text key={index} style={index === 0 ? styles.bold : undefined}>{line}</Text>
              ))}
            </View>
          </View>
          <Text style={styles.footerNote}>{data.footer.note}</Text>
        </View>

        {/* Header: wordmark and customer, title box. */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt */}
            <Image src={{ data: data.logo, format: "png" }} style={styles.logo} />
            <Text style={styles.customerName}>{data.customer.name}</Text>
            {data.customer.lines.map((line, index) => (
              <Text key={index} style={styles.customerLine}>{line}</Text>
            ))}
            <Text style={[styles.muted, { marginTop: 8 }]}>
              For questions about your order, visit <Text style={styles.link}>{data.seller.supportUrl}</Text>
            </Text>
          </View>
          <View>
            <View style={styles.titleBox}>
              <Text style={styles.titleText}>{data.title}</Text>
              <Text style={styles.titleLine}><Text style={styles.bold}>Issue Date: </Text>{data.issueDate}</Text>
              <Text style={styles.titleLine}><Text style={styles.bold}>Invoice No: </Text>{data.invoiceNumber}</Text>
              <Text style={styles.titleLine}><Text style={styles.bold}>Total Payable: </Text>{money(data.totals.payable)}</Text>
            </View>
          </View>
        </View>

        {/* Billing and delivery (the order's one address), and the seller. */}
        <View style={styles.addressRow}>
          <AddressColumn title="Billing Address" customer={data.customer} />
          <AddressColumn title="Delivery Address" customer={data.customer} divided />
          <View style={styles.addressBoxDivided}>
            <Text style={styles.boxTitle}>Sold by</Text>
            <Text>{data.seller.name}</Text>
            {data.seller.address ? <Text>{data.seller.address}</Text> : null}
            {data.seller.vat ? <Text>{data.seller.vat}</Text> : null}
            {data.seller.email ? (
              <Text>Email: <Text style={styles.link}>{data.seller.email}</Text></Text>
            ) : null}
            <Text>Website: <Text style={styles.link}>{data.seller.website}</Text></Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Order Information</Text>
        <View style={{ marginBottom: 8 }}>
          <View style={styles.kv}><Text style={styles.kvKey}>Order Date</Text><Text style={styles.bold}>{data.orderDate}</Text></View>
          <View style={styles.kv}><Text style={styles.kvKey}>Order Number</Text><Text style={styles.bold}>{data.orderNumber}</Text></View>
          {data.deliveredOn && (
            <View style={styles.kv}><Text style={styles.kvKey}>Delivered On</Text><Text style={styles.bold}>{data.deliveredOn}</Text></View>
          )}
          <View style={styles.kv}><Text style={styles.kvKey}>Payment Method</Text><Text style={styles.bold}>{data.payment.method}</Text></View>
          <View style={styles.kv}><Text style={styles.kvKey}>Payment Status</Text><Text style={styles.bold}>{data.payment.status}</Text></View>
        </View>

        <Text style={styles.sectionTitle}>Invoice Detail</Text>
        <View style={styles.table}>
          <View fixed style={styles.th}>
            <Text style={[styles.cell, { width: COLUMNS.description }]}>Description</Text>
            <Text style={[styles.cell, styles.ctr, { width: COLUMNS.qty }]}>Qty</Text>
            <Text style={[styles.cell, styles.num, { width: COLUMNS.excl }]}>Unit Price (excl. {taxName})</Text>
            <Text style={[styles.cell, styles.num, { width: COLUMNS.rate }]}>{taxName} Rate</Text>
            <Text style={[styles.cell, styles.num, { width: COLUMNS.vat }]}>Unit {taxName}</Text>
            <Text style={[styles.cell, styles.num, { width: COLUMNS.incl }]}>Unit Price (incl. {taxName})</Text>
            <Text style={[styles.cell, styles.num, { width: COLUMNS.total }]}>Item Subtotal (incl. {taxName})</Text>
          </View>
          {data.rows.map((row, index) => (
            <Row key={index} row={row} rate={data.ratePercent} signed={signed} />
          ))}
          {data.delivery && <Row row={data.delivery} rate={data.ratePercent} signed={signed} highlight bold />}
          {data.discount && <Row row={data.discount} rate={data.ratePercent} signed={signed} bold />}
        </View>

        {/* Terms (only when set) beside the total and VAT summary; kept together. */}
        <View style={styles.bottom} wrap={false}>
          <View style={styles.leftCol}>
            {data.terms.length > 0 && (
              <View style={[styles.box, styles.terms]}>
                <Text style={[styles.boxTitle, { color: INK }]}>Terms &amp; Conditions</Text>
                {data.terms.map((term, index) => (
                  <Text key={index} style={{ marginBottom: 2 }}>{index + 1}. {term}</Text>
                ))}
              </View>
            )}
          </View>

          <View style={styles.rightCol}>
            <View style={styles.summaryBox}>
              <View style={styles.totalLine}>
                <Text>Total Payable</Text>
                <Text>{money(data.totals.payable)}</Text>
              </View>
              <Text style={[styles.bold, { marginBottom: 6 }]}>{taxName} Summary</Text>
              <View style={[styles.tr, { borderBottomColor: RULE }]}>
                <Text style={[styles.cell, styles.bold, { width: "28%" }]}>{taxName} Rate</Text>
                <Text style={[styles.cell, styles.bold, styles.num, { width: "42%" }]}>Subtotal (excl. {taxName})</Text>
                <Text style={[styles.cell, styles.bold, styles.num, { width: "30%" }]}>{taxName}</Text>
              </View>
              <View style={styles.tr}>
                <Text style={[styles.cell, { width: "28%" }]}>{data.ratePercent}%</Text>
                <Text style={[styles.cell, styles.num, { width: "42%" }]}>{money(data.totals.excl)}</Text>
                <Text style={[styles.cell, styles.num, { width: "30%" }]}>{money(data.totals.vat)}</Text>
              </View>
              <View style={[styles.tr, { borderBottomWidth: 0, borderTopWidth: 1, borderTopColor: RULE }]}>
                <Text style={[styles.cell, styles.bold, { width: "28%" }]}>Total</Text>
                <Text style={[styles.cell, styles.bold, styles.num, { width: "42%" }]}>{money(data.totals.excl)}</Text>
                <Text style={[styles.cell, styles.bold, styles.num, { width: "30%" }]}>{money(data.totals.vat)}</Text>
              </View>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}

function AddressColumn({
  title,
  customer,
  divided = false,
}: {
  title: string;
  customer: InvoiceDocumentData["customer"];
  divided?: boolean;
}) {
  return (
    <View style={divided ? styles.addressBoxDivided : styles.addressBox}>
      <Text style={styles.boxTitle}>{title}</Text>
      <Text>{customer.name}</Text>
      {customer.lines.map((line, index) => (
        <Text key={index}>{line}</Text>
      ))}
    </View>
  );
}

function Row({
  row,
  rate,
  signed,
  highlight = false,
  bold = false,
}: {
  row: InvoiceRow;
  rate: number;
  signed: (minor: number) => string;
  highlight?: boolean;
  bold?: boolean;
}) {
  return (
    <View wrap={false} style={[styles.tr, highlight ? { backgroundColor: HIGHLIGHT } : {}]}>
      <View style={[styles.cell, { width: COLUMNS.description }]}>
        <Text style={bold ? styles.bold : undefined}>{row.description}</Text>
        {row.sku && <Text style={styles.sku}>SKU: {row.sku}</Text>}
      </View>
      <Text style={[styles.cell, styles.ctr, { width: COLUMNS.qty }]}>{row.quantity}</Text>
      <Text style={[styles.cell, styles.num, { width: COLUMNS.excl }]}>{signed(row.unitExcl)}</Text>
      <Text style={[styles.cell, styles.num, { width: COLUMNS.rate }]}>{rate}%</Text>
      <Text style={[styles.cell, styles.num, { width: COLUMNS.vat }]}>{signed(row.unitVat)}</Text>
      <Text style={[styles.cell, styles.num, { width: COLUMNS.incl }]}>{signed(row.unitIncl)}</Text>
      <Text style={[styles.cell, styles.num, { width: COLUMNS.total }]}>{signed(row.totalIncl)}</Text>
    </View>
  );
}
