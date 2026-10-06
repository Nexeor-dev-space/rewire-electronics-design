"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api/api-client";
import { API_ENDPOINTS } from "@/lib/api/api-endpoints";
import type { Paginated } from "@/lib/api/api-response";
import type { ProductDetail } from "@/types/product";
import type { TrashFilters, TrashProduct } from "@/types/trash";
import type { UserDetail, UserListItem } from "@/types/user";

const trashKeys = {
  all: ["trash"] as const,
  products: (filters: TrashFilters) => ["trash", "products", filters] as const,
  product: (id: string) => ["trash", "product", id] as const,
  users: (filters: TrashFilters) => ["trash", "users", filters] as const,
  user: (id: string) => ["trash", "user", id] as const,
};

/** A restore or purge changes the record's own lists and adds a change log entry. */
const AFFECTED_KEYS = [["trash"], ["products"], ["inventory"], ["users"], ["audit-logs"]];

const endpoints = API_ENDPOINTS.admin.trash;

/* ---------- queries ---------- */

export function useGetTrashProducts(filters: TrashFilters) {
  return useQuery({
    queryKey: trashKeys.products(filters),
    queryFn: ({ signal }) =>
      apiRequest<Paginated<TrashProduct>>(endpoints.products, { query: filters, signal }),
    placeholderData: keepPreviousData,
  });
}

export function useGetTrashProduct(id: string | null) {
  return useQuery({
    queryKey: trashKeys.product(id ?? ""),
    queryFn: ({ signal }) => apiRequest<ProductDetail>(endpoints.product(id ?? ""), { signal }),
    enabled: Boolean(id),
    gcTime: 0,
  });
}

export function useGetTrashUsers(filters: TrashFilters) {
  return useQuery({
    queryKey: trashKeys.users(filters),
    queryFn: ({ signal }) =>
      apiRequest<Paginated<UserListItem>>(endpoints.users, { query: filters, signal }),
    placeholderData: keepPreviousData,
  });
}

export function useGetTrashUser(id: string | null) {
  return useQuery({
    queryKey: trashKeys.user(id ?? ""),
    queryFn: ({ signal }) => apiRequest<UserDetail>(endpoints.user(id ?? ""), { signal }),
    enabled: Boolean(id),
    gcTime: 0,
  });
}

/* ---------- mutations ---------- */

function useTrashMutation<T>(mutationFn: (id: string) => Promise<T>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () =>
      Promise.all(AFFECTED_KEYS.map((queryKey) => queryClient.invalidateQueries({ queryKey }))),
  });
}

export function useRestoreProduct() {
  return useTrashMutation((id) =>
    apiRequest<ProductDetail>(endpoints.restoreProduct(id), { method: "POST" }),
  );
}

export function usePurgeProduct() {
  return useTrashMutation((id) => apiRequest<{ id: string }>(endpoints.product(id), { method: "DELETE" }));
}

export function useRestoreUser() {
  return useTrashMutation((id) => apiRequest<UserDetail>(endpoints.restoreUser(id), { method: "POST" }));
}
