"use client";

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api/api-client";
import { API_ENDPOINTS } from "@/lib/api/api-endpoints";
import type { DashboardMetrics } from "@/types/dashboard";

export const dashboardKeys = {
  all: ["dashboard"] as const,
};

export function useDashboardMetrics() {
  return useQuery({
    queryKey: dashboardKeys.all,
    queryFn: ({ signal }) => apiRequest<DashboardMetrics>(API_ENDPOINTS.admin.dashboard, { signal }),
    refetchOnMount: "always",
  });
}
