import "server-only";

import type { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import {
  REPORT_TOP_COUPONS_LIMIT,
  REPORT_TOP_PRODUCTS_LIMIT,
  STORE_TIME_ZONE,
} from "@/lib/constants";
import { storeDayStart, storeToday } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { EMIRATE_VALUES, emirateLabel, type Emirate } from "@/lib/emirates";
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  type PaymentMethod,
} from "@/lib/orders";
import {
  INVENTORY_STATUSES,
  INVENTORY_STATUS_LABELS,
  NOT_A_SALE_ORDER_STATUS,
  SALE_PAYMENT_STATUSES,
  addDays,
  averageOrderValue,
  fillBuckets,
  inventoryStatus,
  reportBucketUnit,
  reportBuckets,
  type InventoryStatus,
  type ReportBucketUnit,
  type ReportKey,
  type ReportPeriod,
} from "@/lib/reports";
import {
  ACTIVE_RETURN_STATUSES,
  CLOSED_RETURN_STATUSES,
  RETURN_REASONS,
  RETURN_REASON_META,
  RETURN_STATUSES,
  RETURN_STATUS_LABELS,
} from "@/lib/returns";
import {
  OPEN_WARRANTY_CLAIM_STATUSES,
  WARRANTY_CLAIM_STATUSES,
  WARRANTY_CLAIM_STATUS_LABELS,
  WARRANTY_STATUSES,
  WARRANTY_STATUS_LABELS,
} from "@/lib/warranty";
import { variantLabel } from "@/services/return.service";
import { warrantyDeviceWhere, warrantyStatusWhere } from "@/services/warranty.service";
import { LOW_STOCK_THRESHOLD } from "@/types/commerce";
import type {
  InventoryReport,
  OtherReport,
  ProductsReport,
  ReportCountRow,
  ReportData,
  ReturnsReport,
  ReturnsTrendPoint,
  SalesByRow,
  SalesReport,
  SalesTrendPoint,
  WarrantyReport,
} from "@/types/report";
import type { reportQuerySchema } from "@/validators/report.validator";

type ReportQuery = z.output<typeof reportQuerySchema>;
type CreatedAtRange = { gte: Date; lt: Date };

const PRODUCT_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;
const PRODUCT_STATUS_LABELS: Record<(typeof PRODUCT_STATUSES)[number], string> = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
  ARCHIVED: "Archived",
};

/* ---------- shared rules ---------- */

const saleOrderWhere = {
  status: { not: NOT_A_SALE_ORDER_STATUS },
  paymentStatus: { in: [...SALE_PAYMENT_STATUSES] },
} satisfies Prisma.OrderWhereInput;

/** Trashed and archived products aren't for sale, so their stock isn't reported. */
const stockedProductWhere = {
  deletedAt: null,
  status: { not: "ARCHIVED" },
} satisfies Prisma.ProductWhereInput;

const STOCK_WHERE: Record<InventoryStatus, Prisma.ProductVariantWhereInput> = {
  OUT_OF_STOCK: { stock: { lte: 0 } },
  LOW_STOCK: { stock: { gt: 0, lt: LOW_STOCK_THRESHOLD } },
  IN_STOCK: { stock: { gte: LOW_STOCK_THRESHOLD } },
};

function rangeOf({ from, to }: ReportQuery): CreatedAtRange | undefined {
  if (!from || !to) return undefined;
  return { gte: storeDayStart(from), lt: storeDayStart(addDays(to, 1)) };
}

function periodOf(query: ReportQuery): ReportPeriod {
  const from = query.from ?? null;
  const to = query.to ?? null;
  return { from, to, unit: reportBucketUnit(from, to) };
}

function nameContains(search: string | undefined) {
  return search ? { contains: search, mode: "insensitive" as const } : undefined;
}

function countRows<K extends string>(
  keys: readonly K[],
  labels: Record<K, string>,
  counted: readonly { key: K; count: number }[],
): ReportCountRow[] {
  const byKey = new Map(counted.map((row) => [row.key, row.count]));
  return keys.map((key) => ({ key, label: labels[key], count: byKey.get(key) ?? 0 }));
}

function sumOf(rows: readonly { count: number }[]) {
  return rows.reduce((sum, row) => sum + row.count, 0);
}

function sumWhere(rows: readonly ReportCountRow[], keys: readonly string[]) {
  return sumOf(rows.filter((row) => keys.includes(row.key)));
}

/* ---------- trend queries ----------
   `createdAt` is stored in UTC without a zone. Grouping happens in the database
   rather than by loading rows, and on the store's clock, so a sale at 11pm in
   Dubai lands on that day. */

function rawRange(range: CreatedAtRange | undefined): Prisma.Sql {
  if (!range) return Prisma.sql`TRUE`;
  return Prisma.sql`"createdAt" >= (${range.gte.toISOString()}::timestamptz AT TIME ZONE 'UTC')
    AND "createdAt" < (${range.lt.toISOString()}::timestamptz AT TIME ZONE 'UTC')`;
}

function rawBucket(unit: ReportBucketUnit): Prisma.Sql {
  return Prisma.sql`to_char(date_trunc(${unit}, "createdAt" AT TIME ZONE 'UTC' AT TIME ZONE ${STORE_TIME_ZONE}), 'YYYY-MM-DD')`;
}

function rawStatus(status: string | undefined): Prisma.Sql {
  return status ? Prisma.sql`"status"::text = ${status}` : Prisma.sql`TRUE`;
}

const rawIsSale = Prisma.sql`"status"::text <> ${NOT_A_SALE_ORDER_STATUS}
  AND "paymentStatus"::text IN (${Prisma.join(SALE_PAYMENT_STATUSES)})`;

/** The buckets a trend covers. All time starts at its first row, since it has no start of its own. */
function trendBuckets(period: ReportPeriod, firstBucket: string | undefined): string[] {
  const from = period.from ?? firstBucket;
  if (!from) return [];
  return reportBuckets(from, period.to ?? storeToday(new Date()), period.unit);
}

/* ---------- sales and orders ---------- */

export async function getSalesReport(query: ReportQuery): Promise<SalesReport> {
  const range = rangeOf(query);
  const period = periodOf(query);

  const [statusGroups, rows] = await Promise.all([
    prisma.order.groupBy({
      by: ["status"],
      where: { createdAt: range, status: query.orderStatus },
      orderBy: { status: "asc" },
      _count: { _all: true },
    }),
    prisma.$queryRaw<Omit<SalesTrendPoint, "netSales">[]>`
      SELECT ${rawBucket(period.unit)} AS bucket,
        COUNT(*)::int AS orders,
        (COUNT(*) FILTER (WHERE ${rawIsSale}))::int AS "paidOrders",
        COALESCE(SUM("total") FILTER (WHERE ${rawIsSale}), 0)::float8 AS "grossSales",
        COALESCE(SUM("refundedAmount") FILTER (WHERE ${rawIsSale}), 0)::float8 AS refunds
      FROM orders
      WHERE ${rawRange(range)} AND ${rawStatus(query.orderStatus)}
      GROUP BY 1
      ORDER BY 1`,
  ]);

  const points = rows.map((row) => ({ ...row, netSales: row.grossSales - row.refunds }));
  // Every total is the sum of the trend, so the cards and the charts can't disagree.
  const total = (pick: (point: SalesTrendPoint) => number) => points.reduce((sum, point) => sum + pick(point), 0);
  const netSales = total((point) => point.netSales);
  const paidOrders = total((point) => point.paidOrders);

  return {
    generatedAt: new Date().toISOString(),
    period,
    totals: {
      orders: total((point) => point.orders),
      paidOrders,
      grossSales: total((point) => point.grossSales),
      refunds: total((point) => point.refunds),
      netSales,
      averageOrderValue: averageOrderValue(netSales, paidOrders),
    },
    statuses: countRows(
      ORDER_STATUSES,
      ORDER_STATUS_LABELS,
      statusGroups.map((group) => ({ key: group.status, count: group._count._all })),
    ),
    trend: fillBuckets(trendBuckets(period, points[0]?.bucket), points, {
      orders: 0,
      paidOrders: 0,
      grossSales: 0,
      refunds: 0,
      netSales: 0,
    }),
  };
}

/* ---------- products ---------- */

export async function getProductsReport(query: ReportQuery): Promise<ProductsReport> {
  const name = nameContains(query.search);
  const soldWhere: Prisma.OrderItemWhereInput = {
    productName: name,
    order: { ...saleOrderWhere, createdAt: rangeOf(query) },
  };

  const [statusGroups, sold, top] = await Promise.all([
    prisma.product.groupBy({
      by: ["status"],
      where: { deletedAt: null, name },
      orderBy: { status: "asc" },
      _count: { _all: true },
    }),
    prisma.orderItem.aggregate({ where: soldWhere, _sum: { quantity: true, lineTotal: true } }),
    prisma.orderItem.groupBy({
      by: ["productSlug"],
      where: soldWhere,
      _max: { productName: true, brandName: true },
      _sum: { quantity: true, lineTotal: true },
      orderBy: [{ _sum: { quantity: "desc" } }, { productSlug: "asc" }],
      take: REPORT_TOP_PRODUCTS_LIMIT,
    }),
  ]);

  const statuses = countRows(
    PRODUCT_STATUSES,
    PRODUCT_STATUS_LABELS,
    statusGroups.map((group) => ({ key: group.status, count: group._count._all })),
  );

  return {
    generatedAt: new Date().toISOString(),
    period: periodOf(query),
    totals: {
      products: sumOf(statuses),
      unitsSold: sold._sum.quantity ?? 0,
      salesValue: sold._sum.lineTotal ?? 0,
    },
    statuses,
    topProducts: top.map((row) => ({
      slug: row.productSlug,
      name: row._max.productName ?? row.productSlug,
      brand: row._max.brandName ?? "",
      unitsSold: row._sum.quantity ?? 0,
      salesValue: row._sum.lineTotal ?? 0,
    })),
  };
}

/* ---------- inventory ---------- */

export async function getInventoryReport(query: ReportQuery): Promise<InventoryReport> {
  const { page, pageSize, search, inventoryStatus: status } = query;
  const scope: Prisma.ProductVariantWhereInput = {
    product: { ...stockedProductWhere, name: nameContains(search) },
  };
  const where: Prisma.ProductVariantWhereInput = { AND: [scope, status ? STOCK_WHERE[status] : {}] };
  const counted = status ? [status] : INVENTORY_STATUSES;

  const [units, counts, rows, total] = await Promise.all([
    prisma.productVariant.aggregate({ where, _sum: { stock: true } }),
    prisma.$transaction(
      counted.map((key) => prisma.productVariant.count({ where: { AND: [scope, STOCK_WHERE[key]] } })),
    ),
    prisma.productVariant.findMany({
      where,
      select: {
        id: true,
        sku: true,
        storage: true,
        colour: true,
        stock: true,
        product: { select: { name: true } },
      },
      orderBy: [{ stock: "asc" }, { sku: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.productVariant.count({ where }),
  ]);

  const statuses = countRows(
    INVENTORY_STATUSES,
    INVENTORY_STATUS_LABELS,
    counted.map((key, index) => ({ key, count: counts[index] })),
  );

  return {
    generatedAt: new Date().toISOString(),
    lowStockThreshold: LOW_STOCK_THRESHOLD,
    totals: { variants: sumOf(statuses), units: units._sum.stock ?? 0 },
    statuses,
    rows: {
      items: rows.map((row) => ({
        id: row.id,
        sku: row.sku,
        productName: row.product.name,
        variantLabel: variantLabel(row.storage, row.colour),
        stock: row.stock,
        status: inventoryStatus(row.stock),
      })),
      page,
      pageSize,
      total,
    },
  };
}

/* ---------- returns ---------- */

export async function getReturnsReport(query: ReportQuery): Promise<ReturnsReport> {
  const range = rangeOf(query);
  const period = periodOf(query);
  const where: Prisma.ReturnRequestWhereInput = { createdAt: range, status: query.returnStatus };

  const [statusGroups, reasonGroups, refunded, rows] = await Promise.all([
    prisma.returnRequest.groupBy({
      by: ["status"],
      where,
      orderBy: { status: "asc" },
      _count: { _all: true },
    }),
    prisma.returnRequest.groupBy({
      by: ["reason"],
      where,
      orderBy: { reason: "asc" },
      _count: { _all: true },
    }),
    prisma.returnRequest.aggregate({
      where: { AND: [where, { status: "REFUNDED" }] },
      _sum: { refundAmount: true },
    }),
    prisma.$queryRaw<ReturnsTrendPoint[]>`
      SELECT ${rawBucket(period.unit)} AS bucket, COUNT(*)::int AS requests
      FROM return_requests
      WHERE ${rawRange(range)} AND ${rawStatus(query.returnStatus)}
      GROUP BY 1
      ORDER BY 1`,
  ]);

  const statuses = countRows(
    RETURN_STATUSES,
    RETURN_STATUS_LABELS,
    statusGroups.map((group) => ({ key: group.status, count: group._count._all })),
  );
  const reasonLabels = Object.fromEntries(RETURN_REASONS.map((reason) => [reason, RETURN_REASON_META[reason].label]));

  return {
    generatedAt: new Date().toISOString(),
    period,
    totals: {
      requests: sumOf(statuses),
      open: sumWhere(statuses, ACTIVE_RETURN_STATUSES),
      closed: sumWhere(statuses, CLOSED_RETURN_STATUSES),
      refunded: refunded._sum.refundAmount ?? 0,
    },
    statuses,
    reasons: countRows(
      RETURN_REASONS,
      reasonLabels as Record<(typeof RETURN_REASONS)[number], string>,
      reasonGroups.map((group) => ({ key: group.reason, count: group._count._all })),
    ),
    trend: fillBuckets(trendBuckets(period, rows[0]?.bucket), rows, { requests: 0 }),
  };
}

/* ---------- warranty ---------- */

export async function getWarrantyReport(query: ReportQuery): Promise<WarrantyReport> {
  const now = new Date();
  const range = rangeOf(query);
  const counted = query.warrantyStatus ? [query.warrantyStatus] : WARRANTY_STATUSES;

  const [deviceCounts, claimGroups] = await Promise.all([
    prisma.$transaction(
      counted.map((status) =>
        prisma.device.count({
          where: { AND: [warrantyDeviceWhere, warrantyStatusWhere(status, now), { createdAt: range }] },
        }),
      ),
    ),
    prisma.warrantyClaim.groupBy({
      by: ["status"],
      where: {
        createdAt: range,
        device: { AND: [warrantyDeviceWhere, warrantyStatusWhere(query.warrantyStatus, now)] },
      },
      orderBy: { status: "asc" },
      _count: { _all: true },
    }),
  ]);

  const statuses = countRows(
    WARRANTY_STATUSES,
    WARRANTY_STATUS_LABELS,
    counted.map((key, index) => ({ key, count: deviceCounts[index] })),
  );
  const claimStatuses = countRows(
    WARRANTY_CLAIM_STATUSES,
    WARRANTY_CLAIM_STATUS_LABELS,
    claimGroups.map((group) => ({ key: group.status, count: group._count._all })),
  );
  const claims = sumOf(claimStatuses);
  const openClaims = sumWhere(claimStatuses, OPEN_WARRANTY_CLAIM_STATUSES);

  return {
    generatedAt: now.toISOString(),
    period: periodOf(query),
    totals: { devices: sumOf(statuses), claims, openClaims, closedClaims: claims - openClaims },
    statuses,
    claimStatuses,
  };
}

/* ---------- other metrics ---------- */

function salesByRows<K extends string>(
  keys: readonly K[],
  label: (key: K) => string,
  groups: readonly {
    key: K;
    orders: number;
    total: number | null;
    refunded: number | null;
  }[],
): SalesByRow[] {
  const byKey = new Map(groups.map((group) => [group.key, group]));
  return keys.map((key) => {
    const group = byKey.get(key);
    return {
      key,
      label: label(key),
      orders: group?.orders ?? 0,
      netSales: (group?.total ?? 0) - (group?.refunded ?? 0),
    };
  });
}

export async function getOtherReport(query: ReportQuery): Promise<OtherReport> {
  const range = rangeOf(query);
  const where: Prisma.OrderWhereInput = { ...saleOrderWhere, createdAt: range };

  const [totals, guestOrders, newCustomers, methodGroups, emirateGroups, couponGroups] = await Promise.all([
    prisma.order.aggregate({
      where,
      _count: { _all: true },
      _sum: { discount: true, vatIncluded: true, deliveryFee: true },
    }),
    prisma.order.count({ where: { AND: [where, { placedAsGuest: true }] } }),
    prisma.user.count({ where: { role: "CUSTOMER", isGuest: false, state: "ACTIVE", createdAt: range } }),
    prisma.order.groupBy({
      by: ["paymentMethod"],
      where,
      orderBy: { paymentMethod: "asc" },
      _count: { _all: true },
      _sum: { total: true, refundedAmount: true },
    }),
    prisma.order.groupBy({
      by: ["emirate"],
      where,
      orderBy: { emirate: "asc" },
      _count: { _all: true },
      _sum: { total: true, refundedAmount: true },
    }),
    prisma.order.groupBy({
      by: ["couponCode"],
      where: { AND: [where, { couponCode: { not: null } }] },
      orderBy: [{ _sum: { discount: "desc" } }, { couponCode: "asc" }],
      take: REPORT_TOP_COUPONS_LIMIT,
      _count: { _all: true },
      _sum: { discount: true },
    }),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    period: periodOf(query),
    totals: {
      discounts: totals._sum.discount ?? 0,
      vatIncluded: totals._sum.vatIncluded ?? 0,
      deliveryFees: totals._sum.deliveryFee ?? 0,
      newCustomers,
      guestOrders,
      paidOrders: totals._count._all,
    },
    paymentMethods: salesByRows<PaymentMethod>(
      PAYMENT_METHODS,
      (method) => PAYMENT_METHOD_LABELS[method],
      methodGroups.map((group) => ({
        key: group.paymentMethod,
        orders: group._count._all,
        total: group._sum.total,
        refunded: group._sum.refundedAmount,
      })),
    ),
    emirates: salesByRows<Emirate>(
      EMIRATE_VALUES,
      emirateLabel,
      emirateGroups.map((group) => ({
        key: group.emirate,
        orders: group._count._all,
        total: group._sum.total,
        refunded: group._sum.refundedAmount,
      })),
    ),
    coupons: couponGroups.map((group) => ({
      code: group.couponCode ?? "",
      orders: group._count._all,
      discount: group._sum.discount ?? 0,
    })),
  };
}

const REPORT_LOADERS: { [K in ReportKey]: (query: ReportQuery) => Promise<ReportData[K]> } = {
  sales: getSalesReport,
  products: getProductsReport,
  inventory: getInventoryReport,
  returns: getReturnsReport,
  warranty: getWarrantyReport,
  other: getOtherReport,
};

export function getReport(report: ReportKey, query: ReportQuery) {
  return REPORT_LOADERS[report](query);
}
