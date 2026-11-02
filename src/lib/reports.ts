import { REPORT_DAILY_BUCKET_MAX_DAYS, MS_PER_DAY, STORE_TIME_ZONE_LABEL } from "@/lib/constants";
import { formatOrderDate } from "@/lib/dates";
import { LOCALE } from "@/lib/money";
import type { OrderStatus, PaymentStatus } from "@/lib/orders";
import { availabilityFromStock } from "@/types/commerce";

/* ---------- the reports ---------- */

export const REPORT_KEYS = ["sales", "products", "inventory", "returns", "warranty", "other"] as const;
export type ReportKey = (typeof REPORT_KEYS)[number];

export const REPORT_LABELS: Record<ReportKey, string> = {
  sales: "Sales & orders",
  products: "Products",
  inventory: "Inventory",
  returns: "Returns",
  warranty: "Warranty",
  other: "Other metrics",
};

/* ---------- what counts as a sale ----------
   One rule, used by every sales figure: the order was paid at some point and
   wasn't cancelled. Refunds are taken off net sales rather than removing the
   order. See docs/REPORTS.md. */

export const SALE_PAYMENT_STATUSES = [
  "PAID",
  "PARTIALLY_REFUNDED",
  "REFUNDED",
] as const satisfies readonly PaymentStatus[];

export const NOT_A_SALE_ORDER_STATUS = "CANCELLED" satisfies OrderStatus;

/** Net sales per paid order, or null when nothing was paid: no average is not an average of zero. */
export function averageOrderValue(netSales: number, paidOrders: number): number | null {
  return paidOrders > 0 ? Math.round(netSales / paidOrders) : null;
}

/* ---------- inventory status ---------- */

export const INVENTORY_STATUSES = ["IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK"] as const;
export type InventoryStatus = (typeof INVENTORY_STATUSES)[number];

export const INVENTORY_STATUS_LABELS: Record<InventoryStatus, string> = {
  IN_STOCK: "In stock",
  LOW_STOCK: "Low stock",
  OUT_OF_STOCK: "Out of stock",
};

/** The same reading of a stock count the storefront's badges use. */
export function inventoryStatus(stock: number): InventoryStatus {
  const availability = availabilityFromStock(stock);
  if (availability === "sold-out") return "OUT_OF_STOCK";
  return availability === "low-stock" ? "LOW_STOCK" : "IN_STOCK";
}

/* ---------- date ranges ----------
   A range is two store days, "YYYY-MM-DD", both included. */

export const REPORT_DATE_PRESETS = ["TODAY", "LAST_7", "LAST_30", "LAST_90", "THIS_YEAR", "ALL_TIME", "CUSTOM"] as const;
export type ReportDatePreset = (typeof REPORT_DATE_PRESETS)[number];

export const REPORT_DATE_PRESET_LABELS: Record<ReportDatePreset, string> = {
  TODAY: "Today",
  LAST_7: "Last 7 days",
  LAST_30: "Last 30 days",
  LAST_90: "Last 90 days",
  THIS_YEAR: "This year",
  ALL_TIME: "All time",
  CUSTOM: "Custom range",
};

export interface ReportDateRange {
  from?: string;
  to?: string;
}

function dayToUtc(day: string): number {
  return new Date(`${day}T00:00:00.000Z`).getTime();
}

function utcToDay(time: number): string {
  return new Date(time).toISOString().slice(0, 10);
}

export function addDays(day: string, days: number): string {
  return utcToDay(dayToUtc(day) + days * MS_PER_DAY);
}

/** Days from `from` to `to`, both included. */
export function daysInRange(from: string, to: string): number {
  return Math.round((dayToUtc(to) - dayToUtc(from)) / MS_PER_DAY) + 1;
}

const PRESET_DAYS: Partial<Record<ReportDatePreset, number>> = { TODAY: 1, LAST_7: 7, LAST_30: 30, LAST_90: 90 };

/** The dates a preset stands for. All time and a custom range have none of their own. */
export function dateRangeForPreset(preset: ReportDatePreset, today: string): ReportDateRange {
  const days = PRESET_DAYS[preset];
  if (days) return { from: addDays(today, 1 - days), to: today };
  if (preset === "THIS_YEAR") return { from: `${today.slice(0, 4)}-01-01`, to: today };
  return {};
}

/* ---------- trend buckets ---------- */

export type ReportBucketUnit = "day" | "month";

export interface ReportPeriod {
  /** Null on both means all time. */
  from: string | null;
  to: string | null;
  unit: ReportBucketUnit;
}

export function reportBucketUnit(from: string | null, to: string | null): ReportBucketUnit {
  return from && to && daysInRange(from, to) <= REPORT_DAILY_BUCKET_MAX_DAYS ? "day" : "month";
}

function monthOf(day: string): string {
  return `${day.slice(0, 7)}-01`;
}

function nextMonth(day: string): string {
  const date = new Date(dayToUtc(day));
  date.setUTCMonth(date.getUTCMonth() + 1);
  return utcToDay(date.getTime());
}

/** Every bucket in a range, so a quiet day still has a place on the trend. */
export function reportBuckets(from: string, to: string, unit: ReportBucketUnit): string[] {
  const buckets: string[] = [];
  if (unit === "day") {
    for (let day = from; day <= to; day = addDays(day, 1)) buckets.push(day);
    return buckets;
  }
  for (let month = monthOf(from); month <= to; month = nextMonth(month)) buckets.push(month);
  return buckets;
}

export function fillBuckets<T extends { bucket: string }>(
  buckets: readonly string[],
  rows: readonly T[],
  zero: Omit<T, "bucket">,
): T[] {
  const byBucket = new Map(rows.map((row) => [row.bucket, row]));
  return buckets.map((bucket) => byBucket.get(bucket) ?? ({ ...zero, bucket } as T));
}

export function formatBucket(bucket: string, unit: ReportBucketUnit): string {
  return new Intl.DateTimeFormat(
    LOCALE,
    unit === "day"
      ? { day: "numeric", month: "short", timeZone: "UTC" }
      : { month: "short", year: "numeric", timeZone: "UTC" },
  ).format(new Date(`${bucket}T00:00:00.000Z`));
}

export function reportPeriodLabel(period: ReportPeriod): string {
  if (!period.from || !period.to) return "All time";
  return `${formatOrderDate(period.from)} to ${formatOrderDate(period.to)}, ${STORE_TIME_ZONE_LABEL}`;
}

/* ---------- chart scale ---------- */

const TICKS_TARGET = 4;
const NICE_STEPS = [1, 2, 5, 10];

/** Clean axis ticks from zero up past `max`, whole numbers only. */
export function chartTicks(max: number): number[] {
  if (max <= 0) return [0, 1];
  const rough = max / TICKS_TARGET;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const nice = NICE_STEPS.find((step) => rough / magnitude <= step) ?? 10;
  const step = Math.max(1, nice * magnitude);
  const count = Math.ceil(max / step);
  return Array.from({ length: count + 1 }, (_, index) => index * step);
}

/** A whole percentage of `total`, 0 when there is no total. */
export function shareOf(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}
