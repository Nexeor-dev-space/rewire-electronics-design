"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { dashboardKeys } from "@/hooks/use-dashboard";
import { apiRequest } from "@/lib/api/api-client";
import { API_ENDPOINTS } from "@/lib/api/api-endpoints";
import type { Paginated } from "@/lib/api/api-response";
import { WAITLIST_ADMIN_PAGE_SIZE } from "@/lib/constants";
import type {
  AdminReleaseDetail,
  AdminReleaseRow,
  ReleaseAllocationsInput,
  ReleaseFilters,
  ReleaseInput,
  ReleaseStateInput,
} from "@/types/release";
import type { AdminWaitlistEntry } from "@/types/storefront-release";

const releaseKeys = {
  all: ["releases"] as const,
  list: (filters: ReleaseFilters) => ["releases", "list", filters] as const,
  detail: (id: string) => ["releases", "detail", id] as const,
  waitlist: (id: string, page: number) => ["releases", "waitlist", id, page] as const,
};

const endpoints = API_ENDPOINTS.admin.releases;

function fetchReleaseWaitlist(id: string, page: number, signal?: AbortSignal) {
  return apiRequest<Paginated<AdminWaitlistEntry>>(endpoints.waitlist(id), {
    query: { page, pageSize: WAITLIST_ADMIN_PAGE_SIZE },
    signal,
  });
}

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

export function useGetReleaseWaitlist(id: string, page = 1) {
  return useQuery({
    queryKey: releaseKeys.waitlist(id, page),
    queryFn: ({ signal }) => fetchReleaseWaitlist(id, page, signal),
    enabled: Boolean(id),
    placeholderData: keepPreviousData,
  });
}

export async function fetchAllReleaseWaitlist(id: string): Promise<AdminWaitlistEntry[]> {
  const entries: AdminWaitlistEntry[] = [];
  for (let page = 1; ; page += 1) {
    const result = await fetchReleaseWaitlist(id, page);
    entries.push(...result.items);
    if (entries.length >= result.total || result.items.length === 0) return entries;
  }
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
