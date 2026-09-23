"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api/api-client";
import { API_ENDPOINTS } from "@/lib/api/api-endpoints";
import type { Paginated } from "@/lib/api/api-response";
import type { BrandDetail, BrandFilters, BrandInput, BrandListItem } from "@/types/brand";

const brandKeys = {
  all: ["brands"] as const,
  list: (filters: BrandFilters) => ["brands", "list", filters] as const,
  detail: (id: string) => ["brands", "detail", id] as const,
};

const endpoints = API_ENDPOINTS.admin.brands;

/* ---------- queries ---------- */

export function useGetBrands(filters: BrandFilters = {}) {
  return useQuery({
    queryKey: brandKeys.list(filters),
    queryFn: ({ signal }) =>
      apiRequest<Paginated<BrandListItem>>(endpoints.list, { query: filters, signal }),
    // Keep the current rows on screen while a new search loads.
    placeholderData: keepPreviousData,
  });
}

export function useGetBrand(id: string) {
  return useQuery({
    queryKey: brandKeys.detail(id),
    queryFn: ({ signal }) => apiRequest<BrandDetail>(endpoints.detail(id), { signal }),
    enabled: Boolean(id),
  });
}

/* ---------- mutations ---------- */

export function useCreateBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: BrandInput) =>
      apiRequest<BrandDetail>(endpoints.list, { method: "POST", body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: brandKeys.all }),
  });
}

export function useUpdateBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: BrandInput & { id: string }) =>
      apiRequest<BrandDetail>(endpoints.detail(id), { method: "PUT", body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: brandKeys.all }),
  });
}

export function useDeleteBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<{ id: string }>(endpoints.detail(id), { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: brandKeys.all }),
  });
}
