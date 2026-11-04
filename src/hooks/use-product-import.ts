"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api/api-client";
import { API_ENDPOINTS } from "@/lib/api/api-endpoints";
import type { Paginated } from "@/lib/api/api-response";
import { downloadCsv, toCsv } from "@/lib/csv";
import {
  ERROR_REPORT_HEADERS,
  errorReportFilename,
  isImportUnfinished,
  type ImportMode,
  type ImportRowStatus,
  type ImportStatus,
  type ParsedImportFile,
} from "@/lib/product-import";
import type { ImportPreview, ProductImportItem, ProductImportRowItem } from "@/types/product-import";

const importKeys = {
  all: ["product-imports"] as const,
  list: (filters: ImportFilters) => ["product-imports", "list", filters] as const,
  detail: (id: string) => ["product-imports", "detail", id] as const,
  rows: (id: string, filters: RowFilters) => ["product-imports", "rows", id, filters] as const,
};

type ImportFilters = { page?: number; pageSize?: number; status?: ImportStatus };
type RowFilters = { page?: number; pageSize?: number; status?: ImportRowStatus };

const endpoints = API_ENDPOINTS.admin.productImports;

/* ---------- queries ---------- */

export function useGetProductImports(filters: ImportFilters = {}) {
  return useQuery({
    queryKey: importKeys.list(filters),
    queryFn: ({ signal }) => apiRequest<Paginated<ProductImportItem>>(endpoints.list, { query: filters, signal }),
    placeholderData: keepPreviousData,
  });
}

export function useGetProductImport(id: string) {
  return useQuery({
    queryKey: importKeys.detail(id),
    queryFn: ({ signal }) => apiRequest<ProductImportItem>(endpoints.detail(id), { signal }),
    enabled: Boolean(id),
  });
}

export function useGetProductImportRows(id: string, filters: RowFilters = {}) {
  return useQuery({
    queryKey: importKeys.rows(id, filters),
    queryFn: ({ signal }) => apiRequest<Paginated<ProductImportRowItem>>(endpoints.rows(id), { query: filters, signal }),
    enabled: Boolean(id),
    placeholderData: keepPreviousData,
  });
}

/* ---------- mutations ---------- */

/** Checks a parsed CSV on the server and returns the preview. It saves nothing. */
export function useValidateProductImport() {
  return useMutation({
    mutationFn: ({ mode, file }: { mode: ImportMode; file: ParsedImportFile }) =>
      apiRequest<ImportPreview>(endpoints.validate, {
        method: "POST",
        body: { mode, columns: file.columns, rows: file.rows },
      }),
  });
}

/** Stores a checked file as a Pending import. */
export function useCreateProductImport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ mode, file, fileName }: { mode: ImportMode; file: ParsedImportFile; fileName: string }) =>
      apiRequest<ProductImportItem>(endpoints.list, {
        method: "POST",
        body: { mode, columns: file.columns, rows: file.rows, fileName },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: importKeys.all }),
  });
}

/** Saves the next batch. Products and history refresh once the import has no rows left. */
export function useProcessProductImport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest<ProductImportItem>(endpoints.process(id), { method: "POST" }),
    onSuccess: (record) => {
      if (isImportUnfinished(record.status)) return;
      queryClient.invalidateQueries({ queryKey: importKeys.all });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

/** Fetches the failed rows and saves them as a CSV. */
export function useDownloadImportErrors() {
  return useMutation({
    mutationFn: async (id: string) => {
      const rows = await apiRequest<ProductImportRowItem[]>(endpoints.errors(id));
      const lines = rows.map((row) => [row.rowNumber, row.sku, row.productName, row.error ?? ""]);
      downloadCsv(errorReportFilename(id), toCsv([ERROR_REPORT_HEADERS, ...lines], []));
    },
  });
}
