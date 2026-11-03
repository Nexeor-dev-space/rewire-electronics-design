"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { dashboardKeys } from "@/hooks/use-dashboard";
import { apiRequest } from "@/lib/api/api-client";
import { API_ENDPOINTS } from "@/lib/api/api-endpoints";
import type { Paginated } from "@/lib/api/api-response";
import type { AdminRelease, ReleaseFilters, ReleaseInput } from "@/types/release";

const releaseKeys = {
  all: ["releases"] as const,
  list: (filters: ReleaseFilters) => ["releases", "list", filters] as const,
};

const endpoints = API_ENDPOINTS.admin.releases;

function useInvalidateReleases() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: releaseKeys.all }),
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
    ]);
}

export function useGetReleases(filters: ReleaseFilters = {}) {
  return useQuery({
    queryKey: releaseKeys.list(filters),
    queryFn: ({ signal }) =>
      apiRequest<Paginated<AdminRelease>>(endpoints.list, { query: filters, signal }),
    placeholderData: keepPreviousData,
  });
}

export function useCreateRelease() {
  const invalidate = useInvalidateReleases();
  return useMutation({
    mutationFn: (input: ReleaseInput) =>
      apiRequest<AdminRelease>(endpoints.list, { method: "POST", body: input }),
    onSuccess: invalidate,
  });
}

export function useUpdateRelease() {
  const invalidate = useInvalidateReleases();
  return useMutation({
    mutationFn: ({ id, ...input }: ReleaseInput & { id: string }) =>
      apiRequest<AdminRelease>(endpoints.detail(id), { method: "PUT", body: input }),
    onSuccess: invalidate,
  });
}

export function useDeleteRelease() {
  const invalidate = useInvalidateReleases();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<{ id: string }>(endpoints.detail(id), { method: "DELETE" }),
    onSuccess: invalidate,
  });
}
