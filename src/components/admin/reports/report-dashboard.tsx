"use client";

import { useEffect, useState } from "react";
import { AdminPage } from "@/components/admin/admin-page";
import { Input, Select } from "@/components/ui/input";
import { SEARCH_DEBOUNCE_MS } from "@/lib/constants";
import { storeToday } from "@/lib/dates";
import { ORDER_STATUSES, ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/orders";
import {
  INVENTORY_STATUSES,
  INVENTORY_STATUS_LABELS,
  REPORT_DATE_PRESETS,
  REPORT_DATE_PRESET_LABELS,
  REPORT_KEYS,
  REPORT_LABELS,
  dateRangeForPreset,
  type InventoryStatus,
  type ReportDatePreset,
  type ReportKey,
} from "@/lib/reports";
import { RETURN_STATUSES, RETURN_STATUS_LABELS, type ReturnStatus } from "@/lib/returns";
import { cn } from "@/lib/utils";
import { WARRANTY_STATUSES, WARRANTY_STATUS_LABELS, type WarrantyStatus } from "@/lib/warranty";
import type { ReportFilters } from "@/types/report";
import { InventoryView, OtherView, ProductsView, ReturnsView, SalesView, WarrantyView } from "./report-views";

const DEFAULT_PRESET: ReportDatePreset = "LAST_30";
/** Inventory is stock right now, so a date range would change nothing on it. */
const NO_DATE_REPORTS: readonly ReportKey[] = ["inventory"];
const SEARCH_REPORTS: readonly ReportKey[] = ["products", "inventory"];
const FILTER_FIELD = "h-10 sm:w-56";

export function ReportDashboard() {
  const [report, setReport] = useState<ReportKey>("sales");
  const [preset, setPreset] = useState<ReportDatePreset>(DEFAULT_PRESET);
  const [custom, setCustom] = useState(() => dateRangeForPreset(DEFAULT_PRESET, storeToday(new Date())));
  const [orderStatus, setOrderStatus] = useState<OrderStatus | "">("");
  const [returnStatus, setReturnStatus] = useState<ReturnStatus | "">("");
  const [warrantyStatus, setWarrantyStatus] = useState<WarrantyStatus | "">("");
  const [inventoryStatus, setInventoryStatus] = useState<InventoryStatus | "">("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [inventoryPage, setInventoryPage] = useState(1);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setInventoryPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  const range = preset === "CUSTOM" ? custom : dateRangeForPreset(preset, storeToday(new Date()));
  const dates: ReportFilters = { from: range.from || undefined, to: range.to || undefined };
  const searchFilter = search || undefined;
  const searchSummary = search ? [`Product name contains: ${search}`] : [];

  const showDates = !NO_DATE_REPORTS.includes(report);
  const showSearch = SEARCH_REPORTS.includes(report);

  return (
    <AdminPage
      title="Reports"
      description="Figures read live from orders, products, stock, returns and warranty records. Dates follow the store's clock."
    >
      <div role="group" aria-label="Choose a report" className="mb-5 flex flex-wrap gap-1.5">
        {REPORT_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={report === key}
            onClick={() => setReport(key)}
            className={cn(
              "rounded-md border px-3 py-1.5 text-sm transition-colors duration-(--duration-fast)",
              report === key
                ? "border-ink bg-ink text-void"
                : "border-line text-ink-secondary hover:bg-surface-2 hover:text-ink",
            )}
          >
            {REPORT_LABELS[key]}
          </button>
        ))}
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        {showDates && (
          <Select
            value={preset}
            onChange={(event) => {
              const next = event.target.value as ReportDatePreset;
              // A custom range starts from whatever was showing, rather than empty.
              if (next === "CUSTOM") setCustom(range);
              setPreset(next);
            }}
            aria-label="Reporting period"
            className={FILTER_FIELD}
          >
            {REPORT_DATE_PRESETS.map((value) => (
              <option key={value} value={value}>
                {REPORT_DATE_PRESET_LABELS[value]}
              </option>
            ))}
          </Select>
        )}
        {showDates && preset === "CUSTOM" && (
          <>
            <Input
              type="date"
              value={custom.from ?? ""}
              max={custom.to}
              onChange={(event) => setCustom({ ...custom, from: event.target.value })}
              aria-label="Start date"
              className={FILTER_FIELD}
            />
            <Input
              type="date"
              value={custom.to ?? ""}
              min={custom.from}
              onChange={(event) => setCustom({ ...custom, to: event.target.value })}
              aria-label="End date"
              className={FILTER_FIELD}
            />
          </>
        )}

        {showSearch && (
          <Input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Product name"
            aria-label="Filter by product name"
            className="h-10 sm:w-72"
          />
        )}

        {report === "sales" && (
          <Select
            value={orderStatus}
            onChange={(event) => setOrderStatus(event.target.value as OrderStatus | "")}
            aria-label="Filter by order status"
            className={FILTER_FIELD}
          >
            <option value="">All order statuses</option>
            {ORDER_STATUSES.map((value) => (
              <option key={value} value={value}>
                {ORDER_STATUS_LABELS[value]}
              </option>
            ))}
          </Select>
        )}
        {report === "inventory" && (
          <Select
            value={inventoryStatus}
            onChange={(event) => {
              setInventoryStatus(event.target.value as InventoryStatus | "");
              setInventoryPage(1);
            }}
            aria-label="Filter by stock status"
            className={FILTER_FIELD}
          >
            <option value="">All stock statuses</option>
            {INVENTORY_STATUSES.map((value) => (
              <option key={value} value={value}>
                {INVENTORY_STATUS_LABELS[value]}
              </option>
            ))}
          </Select>
        )}
        {report === "returns" && (
          <Select
            value={returnStatus}
            onChange={(event) => setReturnStatus(event.target.value as ReturnStatus | "")}
            aria-label="Filter by return status"
            className={FILTER_FIELD}
          >
            <option value="">All return statuses</option>
            {RETURN_STATUSES.map((value) => (
              <option key={value} value={value}>
                {RETURN_STATUS_LABELS[value]}
              </option>
            ))}
          </Select>
        )}
        {report === "warranty" && (
          <Select
            value={warrantyStatus}
            onChange={(event) => setWarrantyStatus(event.target.value as WarrantyStatus | "")}
            aria-label="Filter by warranty status"
            className={FILTER_FIELD}
          >
            <option value="">All warranty statuses</option>
            {WARRANTY_STATUSES.map((value) => (
              <option key={value} value={value}>
                {WARRANTY_STATUS_LABELS[value]}
              </option>
            ))}
          </Select>
        )}
      </div>

      {report === "sales" && (
        <SalesView
          filters={{ ...dates, orderStatus: orderStatus || undefined }}
          filterSummary={orderStatus ? [`Order status: ${ORDER_STATUS_LABELS[orderStatus]}`] : []}
        />
      )}
      {report === "products" && (
        <ProductsView filters={{ ...dates, search: searchFilter }} filterSummary={searchSummary} />
      )}
      {report === "inventory" && (
        <InventoryView
          filters={{ search: searchFilter, inventoryStatus: inventoryStatus || undefined }}
          filterSummary={[
            ...searchSummary,
            ...(inventoryStatus ? [`Stock status: ${INVENTORY_STATUS_LABELS[inventoryStatus]}`] : []),
          ]}
          page={inventoryPage}
          onPageChange={setInventoryPage}
        />
      )}
      {report === "returns" && (
        <ReturnsView
          filters={{ ...dates, returnStatus: returnStatus || undefined }}
          filterSummary={returnStatus ? [`Return status: ${RETURN_STATUS_LABELS[returnStatus]}`] : []}
        />
      )}
      {report === "warranty" && (
        <WarrantyView
          filters={{ ...dates, warrantyStatus: warrantyStatus || undefined }}
          filterSummary={warrantyStatus ? [`Warranty status: ${WARRANTY_STATUS_LABELS[warrantyStatus]}`] : []}
        />
      )}
      {report === "other" && <OtherView filters={dates} filterSummary={[]} />}
    </AdminPage>
  );
}
