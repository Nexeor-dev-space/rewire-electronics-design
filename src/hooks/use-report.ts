"use client";

import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api/api-client";
import { API_ENDPOINTS } from "@/lib/api/api-endpoints";
import { REPORT_EXPORT_PAGE_SIZE } from "@/lib/constants";
import { csvHasRows, downloadCsv, toCsv, type CsvCell, type CsvSection } from "@/lib/csv";
import type { ReportKey } from "@/lib/reports";
import type { InventoryRow, ReportData, ReportFilters } from "@/types/report";

const MESSAGE_NOTHING_TO_EXPORT = "There's nothing to export for these filters.";

export const reportKeys = {
  all: ["reports"] as const,
  detail: (report: ReportKey, filters: ReportFilters) => ["reports", report, filters] as const,
};

function fetchReport<K extends ReportKey>(report: K, filters: ReportFilters, signal?: AbortSignal) {
  return apiRequest<ReportData[K]>(API_ENDPOINTS.admin.reports.detail(report), { query: filters, signal });
}

/**
 * Refetches on every mount, so coming back to the page never shows old figures
 * as current. No retry: a date range the server refuses won't improve, and its
 * reason should replace the old figures at once. The error state has Try again.
 */
export function useGetReport<K extends ReportKey>(report: K, filters: ReportFilters) {
  return useQuery({
    queryKey: reportKeys.detail(report, filters),
    queryFn: ({ signal }) => fetchReport(report, filters, signal),
    placeholderData: keepPreviousData,
    refetchOnMount: "always",
    retry: false,
  });
}

/** Every row the inventory filters match, not just the page on screen. */
export async function fetchAllInventoryRows(filters: ReportFilters): Promise<InventoryRow[]> {
  const rows: InventoryRow[] = [];
  for (let page = 1; ; page += 1) {
    const report = await fetchReport("inventory", { ...filters, page, pageSize: REPORT_EXPORT_PAGE_SIZE });
    rows.push(...report.rows.items);
    if (rows.length >= report.rows.total || report.rows.items.length === 0) return rows;
  }
}

export interface ReportExport {
  filename: string;
  titleRows: readonly (readonly CsvCell[])[];
  /** May fetch, for a report whose full rows aren't all on screen. */
  sections: () => Promise<CsvSection[]> | CsvSection[];
}

/** Reads nothing into the cache and changes nothing, so there are no keys to invalidate. */
export function useExportReport() {
  return useMutation({
    mutationFn: async ({ filename, titleRows, sections }: ReportExport) => {
      const built = await sections();
      if (!csvHasRows(built)) throw new Error(MESSAGE_NOTHING_TO_EXPORT);
      downloadCsv(filename, toCsv(titleRows, built));
    },
  });
}
