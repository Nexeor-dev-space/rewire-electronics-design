"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api/api-client";
import { API_ENDPOINTS } from "@/lib/api/api-endpoints";
import type { Paginated } from "@/lib/api/api-response";
import type { AuditFilters, AuditLogEntry } from "@/types/audit";

export const auditLogKeys = {
  all: ["audit-logs"] as const,
  list: (filters: AuditFilters) => ["audit-logs", "list", filters] as const,
};

export function useGetAuditLogs(filters: AuditFilters) {
  return useQuery({
    queryKey: auditLogKeys.list(filters),
    queryFn: ({ signal }) =>
      apiRequest<Paginated<AuditLogEntry>>(API_ENDPOINTS.admin.auditLogs.list, { query: filters, signal }),
    placeholderData: keepPreviousData,
  });
}
