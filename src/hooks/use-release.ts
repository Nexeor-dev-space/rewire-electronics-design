"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { dashboardKeys } from "@/hooks/use-dashboard";
import { apiRequest } from "@/lib/api/api-client";
import { API_ENDPOINTS } from "@/lib/api/api-endpoints";
import type { Paginated } from "@/lib/api/api-response";
import type {
  AdminReleaseDetail,
  AdminReleaseRow,
  ReleaseAllocationsInput,
  ReleaseFilters,
  ReleaseInput,
  ReleaseStateInput,
} from "@/types/release";

const releaseKeys = {
  all: ["releases"] as const,
  list: (filters: ReleaseFilters) => ["releases", "list", filters] as const,
  detail: (id: string) => ["releases", "detail", id] as const,
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

/* ---------- queries ---------- */

export function useGetReleases(filters: ReleaseFilters = {}) {
  return useQuery({
    queryKey: releaseKeys.list(filters),
    queryFn: ({ signal }) =>
      apiRequest<Paginated<AdminReleaseRow>>(endpoints.list, { query: filters, signal }),
    placeholderData: keepPreviousData,
  });
}

export function useGetRelease(id: string) {
  return useQuery({
    queryKey: releaseKeys.detail(id),
    queryFn: ({ signal }) => apiRequest<AdminReleaseDetail>(endpoints.detail(id), { signal }),
    enabled: Boolean(id),
  });
}

export function useCreateRelease() {
  const invalidate = useInvalidateReleases();
  return useMutation({
    mutationFn: (input: ReleaseInput) =>
      apiRequest<AdminReleaseDetail>(endpoints.list, { method: "POST", body: input }),
    onSuccess: invalidate,
  });
}

export function useUpdateRelease() {
  const invalidate = useInvalidateReleases();
  return useMutation({
    mutationFn: ({ id, ...input }: ReleaseInput & { id: string }) =>
      apiRequest<AdminReleaseDetail>(endpoints.detail(id), { method: "PUT", body: input }),
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

export function useChangeReleaseState() {
  const invalidate = useInvalidateReleases();
  return useMutation({
    mutationFn: ({ id, ...input }: ReleaseStateInput & { id: string }) =>
      apiRequest<AdminReleaseDetail>(endpoints.state(id), { method: "PATCH", body: input }),
    onSuccess: invalidate,
  });
}

export function useSetReleaseAllocations() {
  const invalidate = useInvalidateReleases();
  return useMutation({
    mutationFn: ({ id, ...input }: ReleaseAllocationsInput & { id: string }) =>
      apiRequest<AdminReleaseDetail>(endpoints.allocations(id), { method: "PUT", body: input }),
    onSuccess: invalidate,
  });
}
