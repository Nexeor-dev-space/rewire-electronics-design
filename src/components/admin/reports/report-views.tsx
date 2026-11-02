"use client";

import type { UseQueryResult } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { AdminEmptyState } from "@/components/admin/admin-page";
import { StatusPill } from "@/components/account/status-pill";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchAllInventoryRows, useExportReport, useGetReport } from "@/hooks/use-report";
import { ADMIN_PAGE_SIZE, REPORT_TOP_PRODUCTS_LIMIT } from "@/lib/constants";
import type { CsvSection } from "@/lib/csv";
import { formatStoreDateTime, storeToday } from "@/lib/dates";
import { CURRENCY, LOCALE, formatMoney } from "@/lib/money";
import {
  INVENTORY_STATUS_LABELS,
  reportPeriodLabel,
  type InventoryStatus,
  type ReportKey,
  type ReportPeriod,
} from "@/lib/reports";
import {
  inventorySections,
  otherSections,
  productsSections,
  reportFilename,
  reportTitleRows,
  returnsSections,
  salesSections,
  warrantySections,
} from "@/lib/reports-export";
import { cn } from "@/lib/utils";
import type { ReportFilters, SalesByRow } from "@/types/report";
import { BreakdownBars, ReportCard, ReportStat, ReportStats, ReportTable, TrendChart, type ReportColumn } from "./report-charts";

const NO_VALUE = "—";
const MINOR_PER_MAJOR = 100;
const compactMoney = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: CURRENCY,
  notation: "compact",
  maximumFractionDigits: 1,
});

/** Axis ticks are shorter than the figures themselves: "AED 12K". */
function formatMoneyTick(minor: number) {
  return compactMoney.format(minor / MINOR_PER_MAJOR);
}

function formatCount(value: number) {
  return value.toLocaleString(LOCALE);
}

const INVENTORY_TONES: Record<InventoryStatus, "live" | "warn" | "danger"> = {
  IN_STOCK: "live",
  LOW_STOCK: "warn",
  OUT_OF_STOCK: "danger",
};

export interface ReportViewProps {
  filters: ReportFilters;
  /** The filters in words, written into an export: "Order status: Cancelled". */
  filterSummary: string[];
}

/* ---------- the frame every report shares ---------- */

interface ReportFrameProps<T extends { generatedAt: string; period?: ReportPeriod }> {
  report: ReportKey;
  query: UseQueryResult<T, Error>;
  filterSummary: string[];
  isEmpty: (data: T) => boolean;
  emptyTitle: string;
  emptyDescription: string;
  /** What the figures cover, when the date range alone doesn't say it. */
  note?: string;
  sections: (data: T) => CsvSection[] | Promise<CsvSection[]>;
  children: (data: T) => ReactNode;
}

function ReportFrame<T extends { generatedAt: string; period?: ReportPeriod }>({
  report,
  query,
  filterSummary,
  isEmpty,
  emptyTitle,
  emptyDescription,
  note,
  sections,
  children,
}: ReportFrameProps<T>) {
  if (query.isPending) return <ReportSkeleton />;

  if (query.isError) {
    return (
      <div role="alert" className="rounded-xl border border-line bg-surface-2 px-6 py-12 text-center">
        <p className="text-sm text-ink-secondary">{query.error.message}</p>
        <Button variant="outline" size="sm" className="mt-5" onClick={() => query.refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  const { data } = query;
  const empty = isEmpty(data);

  return (
    <div aria-busy={query.isPlaceholderData} className={cn("space-y-4", query.isPlaceholderData && "opacity-60")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-ink">{data.period ? reportPeriodLabel(data.period) : "Current stock"}</p>
          <p className="mt-0.5 text-xs text-ink-secondary">
            As of {formatStoreDateTime(data.generatedAt)}
            {note && `. ${note}`}
          </p>
        </div>
        <ExportButton
          // A new filter set starts with no old export error showing.
          key={filterSummary.join() + data.generatedAt}
          disabled={empty}
          filename={reportFilename(report, data.period, storeToday(new Date()))}
          titleRows={reportTitleRows(report, data.period, data.generatedAt, filterSummary)}
          sections={() => sections(data)}
        />
      </div>

      {empty ? <AdminEmptyState title={emptyTitle} description={emptyDescription} /> : children(data)}
    </div>
  );
}

function ExportButton({
  disabled,
  filename,
  titleRows,
  sections,
}: {
  disabled: boolean;
  filename: string;
  titleRows: ReturnType<typeof reportTitleRows>;
  sections: () => CsvSection[] | Promise<CsvSection[]>;
}) {
  const exporter = useExportReport();
  return (
    <div className="flex flex-col items-end gap-1.5">
      <Button
        variant="outline"
        size="sm"
        disabled={disabled}
        loading={exporter.isPending}
        onClick={() => exporter.mutate({ filename, titleRows, sections })}
      >
        Export CSV
      </Button>
      {exporter.isError && (
        <p role="alert" className="text-xs text-danger">
          {exporter.error.message}
        </p>
      )}
    </div>
  );
}

function ReportSkeleton() {
  return (
    <div aria-busy className="space-y-4">
      <Skeleton className="h-10 w-72" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  );
}

/* ---------- sales and orders ---------- */

export function SalesView({ filters, filterSummary }: ReportViewProps) {
  const query = useGetReport("sales", filters);
  return (
    <ReportFrame
      report="sales"
      query={query}
      filterSummary={filterSummary}
      isEmpty={(data) => data.totals.orders === 0}
      emptyTitle="No orders in this period"
      emptyDescription="Try a longer date range or a different order status."
      sections={salesSections}
    >
      {({ totals, trend, statuses, period }) => (
        <>
          <ReportStats>
            <ReportStat label="Net sales" value={formatMoney(totals.netSales)} note="Paid orders, after refunds" />
            <ReportStat label="Gross sales" value={formatMoney(totals.grossSales)} note="Paid orders, before refunds" />
            <ReportStat label="Refunds" value={formatMoney(totals.refunds)} note="Refunded on these paid orders" />
            <ReportStat label="Orders placed" value={formatCount(totals.orders)} note="Every order, paid or not" />
            <ReportStat label="Paid orders" value={formatCount(totals.paidOrders)} note="Paid and not cancelled" />
            <ReportStat
              label="Average order value"
              value={totals.averageOrderValue === null ? NO_VALUE : formatMoney(totals.averageOrderValue)}
              note="Net sales per paid order"
            />
          </ReportStats>

          <div className="grid gap-4 lg:grid-cols-2">
            <ReportCard title={`Net sales by ${period.unit}`} note={`In ${CURRENCY}`}>
              <TrendChart
                label="Net sales"
                points={trend.map((point) => ({ bucket: point.bucket, value: point.netSales }))}
                unit={period.unit}
                formatValue={formatMoney}
                formatTick={formatMoneyTick}
              />
            </ReportCard>
            <ReportCard title={`Orders placed by ${period.unit}`} note="Number of orders">
              <TrendChart
                label="Orders placed"
                points={trend.map((point) => ({ bucket: point.bucket, value: point.orders }))}
                unit={period.unit}
                formatValue={formatCount}
              />
            </ReportCard>
          </div>

          <ReportCard title="Orders by status" note="Number of orders and share of the period">
            <BreakdownBars rows={statuses} />
          </ReportCard>
        </>
      )}
    </ReportFrame>
  );
}

/* ---------- products ---------- */

export function ProductsView({ filters, filterSummary }: ReportViewProps) {
  const query = useGetReport("products", filters);
  return (
    <ReportFrame
      report="products"
      query={query}
      filterSummary={filterSummary}
      isEmpty={(data) => data.totals.products === 0 && data.topProducts.length === 0}
      emptyTitle="No products match"
      emptyDescription="Try a different product name."
      note="Product counts are as they stand now; units and value cover the period"
      sections={productsSections}
    >
      {({ totals, statuses, topProducts }) => (
        <>
          <ReportStats>
            <ReportStat label="Products" value={formatCount(totals.products)} note="Not in Trash, right now" />
            <ReportStat label="Units sold" value={formatCount(totals.unitsSold)} note="On paid orders" />
            <ReportStat label="Sales value" value={formatMoney(totals.salesValue)} note="Before order discounts and refunds" />
          </ReportStats>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <ReportCard title="Products by status" note="Number of products, right now">
              <BreakdownBars rows={statuses} />
            </ReportCard>
            <ReportCard title="Top sellers" note={`Top ${REPORT_TOP_PRODUCTS_LIMIT} by units sold, on paid orders`}>
              {topProducts.length === 0 ? (
                <p className="text-sm text-ink-secondary">Nothing sold in this period.</p>
              ) : (
                <ReportTable
                  rows={topProducts}
                  rowKey={(row) => row.slug}
                  columns={[
                    { label: "Product", cell: (row) => row.name },
                    { label: "Brand", cell: (row) => row.brand },
                    { label: "Units sold", numeric: true, cell: (row) => formatCount(row.unitsSold) },
                    { label: "Sales value", numeric: true, cell: (row) => formatMoney(row.salesValue) },
                  ]}
                />
              )}
            </ReportCard>
          </div>
        </>
      )}
    </ReportFrame>
  );
}

/* ---------- inventory ---------- */

export function InventoryView({
  filters,
  filterSummary,
  page,
  onPageChange,
}: ReportViewProps & { page: number; onPageChange: (page: number) => void }) {
  const query = useGetReport("inventory", { ...filters, page, pageSize: ADMIN_PAGE_SIZE });
  return (
    <ReportFrame
      report="inventory"
      query={query}
      filterSummary={filterSummary}
      isEmpty={(data) => data.rows.total === 0}
      emptyTitle="No stock records match"
      emptyDescription="Try a different product name or stock status."
      note="Stock is as it stands now, so the date range doesn't apply. Archived and trashed products are left out"
      sections={async (data) => inventorySections(data, await fetchAllInventoryRows(filters))}
    >
      {({ totals, statuses, rows, lowStockThreshold }) => {
        const pages = Math.max(1, Math.ceil(rows.total / ADMIN_PAGE_SIZE));
        return (
          <>
            <ReportStats columns={4}>
              <ReportStat label="Units in stock" value={formatCount(totals.units)} note={`Across ${formatCount(totals.variants)} variants`} />
              {statuses.map((row) => (
                <ReportStat
                  key={row.key}
                  label={row.label}
                  value={formatCount(row.count)}
                  note={row.key === "LOW_STOCK" ? `Variants with fewer than ${lowStockThreshold} units` : "Variants"}
                />
              ))}
            </ReportStats>

            <ReportCard title="Variants" note="Lowest stock first">
              <ReportTable
                rows={rows.items}
                rowKey={(row) => row.id}
                columns={[
                  { label: "SKU", cell: (row) => <span className="font-mono text-xs">{row.sku}</span> },
                  { label: "Product", cell: (row) => row.productName },
                  { label: "Variant", cell: (row) => row.variantLabel || NO_VALUE },
                  { label: "Stock", numeric: true, cell: (row) => formatCount(row.stock) },
                  {
                    label: "Status",
                    cell: (row) => (
                      <StatusPill tone={INVENTORY_TONES[row.status]}>{INVENTORY_STATUS_LABELS[row.status]}</StatusPill>
                    ),
                  },
                ]}
              />

              {pages > 1 && (
                <nav aria-label="Pagination" className="mt-4 flex items-center justify-end gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
                    Previous
                  </Button>
                  <span className="px-1 font-mono text-xs tabular-nums text-ink-secondary">
                    {page} / {pages}
                  </span>
                  <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => onPageChange(page + 1)}>
                    Next
                  </Button>
                </nav>
              )}
            </ReportCard>
          </>
        );
      }}
    </ReportFrame>
  );
}

/* ---------- returns ---------- */

export function ReturnsView({ filters, filterSummary }: ReportViewProps) {
  const query = useGetReport("returns", filters);
  return (
    <ReportFrame
      report="returns"
      query={query}
      filterSummary={filterSummary}
      isEmpty={(data) => data.totals.requests === 0}
      emptyTitle="No return requests in this period"
      emptyDescription="Try a longer date range or a different return status."
      note="Counted by the day a return was requested"
      sections={returnsSections}
    >
      {({ totals, statuses, reasons, trend, period }) => (
        <>
          <ReportStats columns={4}>
            <ReportStat label="Return requests" value={formatCount(totals.requests)} />
            <ReportStat label="Open" value={formatCount(totals.open)} note="Still being worked on" />
            <ReportStat label="Closed" value={formatCount(totals.closed)} note="Refunded or declined" />
            <ReportStat label="Refunded" value={formatMoney(totals.refunded)} note="On these requests" />
          </ReportStats>

          <ReportCard title={`Return requests by ${period.unit}`} note="Number of requests">
            <TrendChart
              label="Return requests"
              points={trend.map((point) => ({ bucket: point.bucket, value: point.requests }))}
              unit={period.unit}
              formatValue={formatCount}
            />
          </ReportCard>

          <div className="grid gap-4 lg:grid-cols-2">
            <ReportCard title="Requests by status" note="Number of requests and share of the period">
              <BreakdownBars rows={statuses} />
            </ReportCard>
            <ReportCard title="Requests by reason" note="Number of requests and share of the period">
              <BreakdownBars rows={reasons} />
            </ReportCard>
          </div>
        </>
      )}
    </ReportFrame>
  );
}

/* ---------- warranty ---------- */

export function WarrantyView({ filters, filterSummary }: ReportViewProps) {
  const query = useGetReport("warranty", filters);
  return (
    <ReportFrame
      report="warranty"
      query={query}
      filterSummary={filterSummary}
      isEmpty={(data) => data.totals.devices === 0 && data.totals.claims === 0}
      emptyTitle="No warranty records in this period"
      emptyDescription="Try a longer date range or a different warranty status."
      note="Devices sold and claims raised in the period; a device's warranty status is as it stands now"
      sections={warrantySections}
    >
      {({ totals, statuses, claimStatuses }) => (
        <>
          <ReportStats>
            <ReportStat label="Warranty records" value={formatCount(totals.devices)} note="One per device sold" />
            {statuses.map((row) => (
              <ReportStat key={row.key} label={row.label} value={formatCount(row.count)} note="Warranty records" />
            ))}
            <ReportStat label="Claims raised" value={formatCount(totals.claims)} />
            <ReportStat label="Open claims" value={formatCount(totals.openClaims)} note="Not yet returned or declined" />
          </ReportStats>

          <div className="grid gap-4 lg:grid-cols-2">
            <ReportCard title="Warranty records by status" note="Number of devices and share of the period">
              <BreakdownBars rows={statuses} />
            </ReportCard>
            <ReportCard title="Claims by status" note="Number of claims and share of the period">
              <BreakdownBars rows={claimStatuses} />
            </ReportCard>
          </div>
        </>
      )}
    </ReportFrame>
  );
}

/* ---------- other metrics ---------- */

const SALES_BY_COLUMNS: ReportColumn<SalesByRow>[] = [
  { label: "Paid orders", numeric: true, cell: (row) => formatCount(row.orders) },
  { label: "Net sales", numeric: true, cell: (row) => formatMoney(row.netSales) },
];

export function OtherView({ filters, filterSummary }: ReportViewProps) {
  const query = useGetReport("other", filters);
  return (
    <ReportFrame
      report="other"
      query={query}
      filterSummary={filterSummary}
      isEmpty={(data) => data.totals.paidOrders === 0 && data.totals.newCustomers === 0}
      emptyTitle="Nothing recorded in this period"
      emptyDescription="Try a longer date range."
      sections={otherSections}
    >
      {({ totals, paymentMethods, emirates, coupons }) => (
        <>
          <ReportStats>
            <ReportStat label="Discounts given" value={formatMoney(totals.discounts)} note="On paid orders" />
            <ReportStat label="VAT included in sales" value={formatMoney(totals.vatIncluded)} note="On paid orders, before refunds" />
            <ReportStat label="Delivery fees charged" value={formatMoney(totals.deliveryFees)} note="On paid orders, before refunds" />
            <ReportStat label="New customer accounts" value={formatCount(totals.newCustomers)} note="Registered, guests not included" />
            <ReportStat label="Paid orders" value={formatCount(totals.paidOrders)} note="Paid and not cancelled" />
            <ReportStat label="Placed as guest" value={formatCount(totals.guestOrders)} note="Of the paid orders" />
          </ReportStats>

          <div className="grid gap-4 lg:grid-cols-2">
            <ReportCard title="Sales by payment method" note="Paid orders, net of refunds">
              <ReportTable
                rows={paymentMethods}
                rowKey={(row) => row.key}
                columns={[{ label: "Payment method", cell: (row) => row.label }, ...SALES_BY_COLUMNS]}
              />
            </ReportCard>
            <ReportCard title="Sales by emirate" note="Paid orders, net of refunds, by delivery emirate">
              <ReportTable
                rows={emirates}
                rowKey={(row) => row.key}
                columns={[{ label: "Emirate", cell: (row) => row.label }, ...SALES_BY_COLUMNS]}
              />
            </ReportCard>
          </div>

          <ReportCard title="Discount codes" note="Largest total discount first, on paid orders">
            {coupons.length === 0 ? (
              <p className="text-sm text-ink-secondary">No discount codes were used in this period.</p>
            ) : (
              <ReportTable
                rows={coupons}
                rowKey={(row) => row.code}
                columns={[
                  { label: "Code", cell: (row) => <span className="font-mono text-xs">{row.code}</span> },
                  { label: "Paid orders", numeric: true, cell: (row) => formatCount(row.orders) },
                  { label: "Discount given", numeric: true, cell: (row) => formatMoney(row.discount) },
                ]}
              />
            )}
          </ReportCard>
        </>
      )}
    </ReportFrame>
  );
}
