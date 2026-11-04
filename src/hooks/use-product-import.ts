"use client";

import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api/api-client";
import { API_ENDPOINTS } from "@/lib/api/api-endpoints";
import type { ImportMode, ParsedImportFile } from "@/lib/product-import";
import type { ImportPreview } from "@/types/product-import";

/**
 * Checks a parsed CSV on the server and returns the preview. It saves
 * nothing, so it is a mutation with no query key to invalidate.
 */
export function useValidateProductImport() {
  return useMutation({
    mutationFn: ({ mode, file }: { mode: ImportMode; file: ParsedImportFile }) =>
      apiRequest<ImportPreview>(API_ENDPOINTS.admin.productImports.validate, {
        method: "POST",
        body: { mode, columns: file.columns, rows: file.rows },
      }),
  });
}
