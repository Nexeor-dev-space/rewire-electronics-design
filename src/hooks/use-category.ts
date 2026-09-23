"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api/api-client";
import { API_ENDPOINTS } from "@/lib/api/api-endpoints";
import type { Paginated } from "@/lib/api/api-response";
import { PICKER_PAGE_SIZE } from "@/lib/constants";
import type {
  CategoryDetail,
  CategoryFilters,
  CategoryInput,
  CategoryNode,
  CategorySummary,
} from "@/types/category";

const categoryKeys = {
  all: ["categories"] as const,
  list: (filters: CategoryFilters) => ["categories", "list", filters] as const,
  detail: (id: string) => ["categories", "detail", id] as const,
};

const endpoints = API_ENDPOINTS.admin.categories;

/** Parents for the picker. One page is enough — see the spec's known limits. */
const PARENT_FILTERS = { type: "parent", pageSize: PICKER_PAGE_SIZE } as const;

/* ---------- queries ---------- */

/** The tree: a page of parents, each carrying its children. */
export function useGetCategories(filters: CategoryFilters = {}) {
  return useQuery({
    queryKey: categoryKeys.list(filters),
    queryFn: ({ signal }) =>
      apiRequest<Paginated<CategoryNode>>(endpoints.list, { query: filters, signal }),
    // Keep the current rows on screen while a new search loads.
    placeholderData: keepPreviousData,
  });
}

export function useGetParentCategories() {
  return useQuery({
    queryKey: categoryKeys.list(PARENT_FILTERS),
    queryFn: ({ signal }) =>
      apiRequest<Paginated<CategorySummary>>(endpoints.list, { query: PARENT_FILTERS, signal }),
  });
}

export function useGetCategory(id: string) {
  return useQuery({
    queryKey: categoryKeys.detail(id),
    queryFn: ({ signal }) => apiRequest<CategoryDetail>(endpoints.detail(id), { signal }),
    enabled: Boolean(id),
  });
}

/* ---------- mutations ---------- */

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CategoryInput) =>
      apiRequest<CategoryDetail>(endpoints.list, { method: "POST", body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: categoryKeys.all }),
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: CategoryInput & { id: string }) =>
      apiRequest<CategoryDetail>(endpoints.detail(id), { method: "PUT", body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: categoryKeys.all }),
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<{ id: string }>(endpoints.detail(id), { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: categoryKeys.all }),
  });
}
