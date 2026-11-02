import type { z } from "zod";
import type { Paginated } from "@/lib/api/api-response";
import type { InventoryStatus, ReportKey, ReportPeriod } from "@/lib/reports";
import type { reportQuerySchema } from "@/validators/report.validator";

export type ReportFilters = Omit<z.input<typeof reportQuerySchema>, "page" | "pageSize"> & {
  page?: number;
  pageSize?: number;
};

interface ReportBase {
  /** ISO string — when the figures were read. */
  generatedAt: string;
}

interface PeriodReport extends ReportBase {
  period: ReportPeriod;
}

/** One row of a breakdown. `key` is the enum value, `label` what staff read. */
export interface ReportCountRow {
  key: string;
  label: string;
  count: number;
}

export interface SalesTrendPoint {
  bucket: string;
  orders: number;
  paidOrders: number;
  grossSales: number;
  refunds: number;
  netSales: number;
}

export interface SalesReport extends PeriodReport {
  totals: {
    orders: number;
    paidOrders: number;
    grossSales: number;
    refunds: number;
    netSales: number;
    averageOrderValue: number | null;
  };
  statuses: ReportCountRow[];
  trend: SalesTrendPoint[];
}

export interface TopProductRow {
  slug: string;
  name: string;
  brand: string;
  unitsSold: number;
  salesValue: number;
}

export interface ProductsReport extends PeriodReport {
  totals: { products: number; unitsSold: number; salesValue: number };
  /** Counts right now, whatever the period. */
  statuses: ReportCountRow[];
  topProducts: TopProductRow[];
}

export interface InventoryRow {
  id: string;
  sku: string;
  productName: string;
  variantLabel: string;
  stock: number;
  status: InventoryStatus;
}

export interface InventoryReport extends ReportBase {
  lowStockThreshold: number;
  totals: { variants: number; units: number };
  statuses: ReportCountRow[];
  rows: Paginated<InventoryRow>;
}

export interface ReturnsTrendPoint {
  bucket: string;
  requests: number;
}

export interface ReturnsReport extends PeriodReport {
  totals: { requests: number; open: number; closed: number; refunded: number };
  statuses: ReportCountRow[];
  reasons: ReportCountRow[];
  trend: ReturnsTrendPoint[];
}

export interface WarrantyReport extends PeriodReport {
  totals: { devices: number; claims: number; openClaims: number; closedClaims: number };
  statuses: ReportCountRow[];
  claimStatuses: ReportCountRow[];
}

export interface SalesByRow {
  key: string;
  label: string;
  orders: number;
  netSales: number;
}

export interface CouponRow {
  code: string;
  orders: number;
  discount: number;
}

export interface OtherReport extends PeriodReport {
  totals: {
    discounts: number;
    vatIncluded: number;
    deliveryFees: number;
    newCustomers: number;
    guestOrders: number;
    paidOrders: number;
  };
  paymentMethods: SalesByRow[];
  emirates: SalesByRow[];
  coupons: CouponRow[];
}

export interface ReportData {
  sales: SalesReport;
  products: ProductsReport;
  inventory: InventoryReport;
  returns: ReturnsReport;
  warranty: WarrantyReport;
  other: OtherReport;
}

export type AnyReport = ReportData[ReportKey];
