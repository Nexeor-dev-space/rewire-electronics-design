import { CURRENCY, fromMinorUnits } from "@/lib/money";
import type { CsvCell, CsvSection } from "@/lib/csv";
import { formatStoreDateTime } from "@/lib/dates";
import {
  INVENTORY_STATUS_LABELS,
  REPORT_LABELS,
  reportPeriodLabel,
  type ReportKey,
  type ReportPeriod,
} from "@/lib/reports";
import type {
  InventoryReport,
  InventoryRow,
  OtherReport,
  ProductsReport,
  ReportCountRow,
  ReturnsReport,
  SalesByRow,
  SalesReport,
  WarrantyReport,
} from "@/types/report";

/* Each report's file holds what its screen shows: the same figures under the
   same labels, in dirhams rather than minor units. */

const SUMMARY_COLUMNS = ["Metric", "Value"];
const NO_FILTERS = "None";

function money(label: string) {
  return `${label} (${CURRENCY})`;
}

function breakdown(title: string, column: string, rows: readonly ReportCountRow[]): CsvSection {
  return { title, columns: [column, "Count"], rows: rows.map((row) => [row.label, row.count]) };
}

function salesBy(title: string, column: string, rows: readonly SalesByRow[]): CsvSection {
  return {
    title,
    columns: [column, "Paid orders", money("Net sales")],
    rows: rows.map((row) => [row.label, row.orders, fromMinorUnits(row.netSales)]),
  };
}

function summary(rows: readonly (readonly CsvCell[])[]): CsvSection {
  return { title: "Summary", columns: SUMMARY_COLUMNS, rows };
}

export function salesSections(report: SalesReport): CsvSection[] {
  const { totals } = report;
  return [
    summary([
      [money("Net sales"), fromMinorUnits(totals.netSales)],
      [money("Gross sales"), fromMinorUnits(totals.grossSales)],
      [money("Refunds"), fromMinorUnits(totals.refunds)],
      ["Orders placed", totals.orders],
      ["Paid orders", totals.paidOrders],
      [money("Average order value"), fromMinorUnits(totals.averageOrderValue)],
    ]),
    breakdown("Orders by status", "Status", report.statuses),
    {
      title: `Trend by ${report.period.unit}`,
      columns: [
        "Starting",
        "Orders placed",
        "Paid orders",
        money("Gross sales"),
        money("Refunds"),
        money("Net sales"),
      ],
      rows: report.trend.map((point) => [
        point.bucket,
        point.orders,
        point.paidOrders,
        fromMinorUnits(point.grossSales),
        fromMinorUnits(point.refunds),
        fromMinorUnits(point.netSales),
      ]),
    },
  ];
}

export function productsSections(report: ProductsReport): CsvSection[] {
  const { totals } = report;
  return [
    summary([
      ["Products", totals.products],
      ["Units sold", totals.unitsSold],
      [money("Sales value before order discounts"), fromMinorUnits(totals.salesValue)],
    ]),
    breakdown("Products by status, right now", "Status", report.statuses),
    {
      title: "Top sellers",
      columns: ["Product", "Brand", "Units sold", money("Sales value before order discounts")],
      rows: report.topProducts.map((row) => [row.name, row.brand, row.unitsSold, fromMinorUnits(row.salesValue)]),
    },
  ];
}

/** `rows` is every variant the filters match; the report itself carries only one page. */
export function inventorySections(report: InventoryReport, rows: readonly InventoryRow[]): CsvSection[] {
  if (rows.length === 0) return [{ title: "Variants", columns: [], rows: [] }];
  return [
    summary([
      ["Variants", report.totals.variants],
      ["Units in stock", report.totals.units],
      ["Low stock means fewer than", report.lowStockThreshold],
    ]),
    breakdown("Variants by stock status", "Status", report.statuses),
    {
      title: "Variants",
      columns: ["SKU", "Product", "Variant", "Stock", "Status"],
      rows: rows.map((row) => [
        row.sku,
        row.productName,
        row.variantLabel,
        row.stock,
        INVENTORY_STATUS_LABELS[row.status],
      ]),
    },
  ];
}

export function returnsSections(report: ReturnsReport): CsvSection[] {
  const { totals } = report;
  return [
    summary([
      ["Return requests", totals.requests],
      ["Open", totals.open],
      ["Closed", totals.closed],
      [money("Refunded"), fromMinorUnits(totals.refunded)],
    ]),
    breakdown("Requests by status", "Status", report.statuses),
    breakdown("Requests by reason", "Reason", report.reasons),
    {
      title: `Trend by ${report.period.unit}`,
      columns: ["Starting", "Return requests"],
      rows: report.trend.map((point) => [point.bucket, point.requests]),
    },
  ];
}

export function warrantySections(report: WarrantyReport): CsvSection[] {
  const { totals } = report;
  return [
    summary([
      ["Warranty records", totals.devices],
      ["Claims raised", totals.claims],
      ["Open claims", totals.openClaims],
      ["Closed claims", totals.closedClaims],
    ]),
    breakdown("Warranty records by status, right now", "Status", report.statuses),
    breakdown("Claims by status", "Status", report.claimStatuses),
  ];
}

export function otherSections(report: OtherReport): CsvSection[] {
  const { totals } = report;
  return [
    summary([
      [money("Discounts given"), fromMinorUnits(totals.discounts)],
      [money("VAT included in sales"), fromMinorUnits(totals.vatIncluded)],
      [money("Delivery fees charged"), fromMinorUnits(totals.deliveryFees)],
      ["New customer accounts", totals.newCustomers],
      ["Paid orders", totals.paidOrders],
      ["Paid orders placed as guest", totals.guestOrders],
    ]),
    salesBy("Sales by payment method", "Payment method", report.paymentMethods),
    salesBy("Sales by emirate", "Emirate", report.emirates),
    {
      title: "Discount codes",
      columns: ["Code", "Paid orders", money("Discount given")],
      rows: report.coupons.map((row) => [row.code, row.orders, fromMinorUnits(row.discount)]),
    },
  ];
}

export function reportFilename(report: ReportKey, period: ReportPeriod | undefined, today: string): string {
  if (!period) return `rewire-${report}-${today}.csv`;
  const dates = period.from && period.to ? `${period.from}-to-${period.to}` : "all-time";
  return `rewire-${report}-${dates}.csv`;
}

export function reportTitleRows(
  report: ReportKey,
  period: ReportPeriod | undefined,
  generatedAt: string,
  filters: readonly string[],
): CsvCell[][] {
  return [
    ["Report", REPORT_LABELS[report]],
    ["Period", period ? reportPeriodLabel(period) : "Current stock"],
    ["Generated", formatStoreDateTime(generatedAt)],
    ["Filters", filters.join("; ") || NO_FILTERS],
  ];
}
