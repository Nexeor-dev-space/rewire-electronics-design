"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api/api-client";
import { API_ENDPOINTS } from "@/lib/api/api-endpoints";
import type { Paginated } from "@/lib/api/api-response";
import type {
  CustomerDetail,
  CustomerFilters,
  CustomerInput,
  CustomerListItem,
} from "@/types/customer";

const customerKeys = {
  all: ["customers"] as const,
  list: (filters: CustomerFilters) => ["customers", "list", filters] as const,
  detail: (id: string) => ["customers", "detail", id] as const,
};

const endpoints = API_ENDPOINTS.admin.customers;

/* ---------- queries ---------- */

export function useGetCustomers(filters: CustomerFilters = {}) {
  return useQuery({
    queryKey: customerKeys.list(filters),
    queryFn: ({ signal }) =>
      apiRequest<Paginated<CustomerListItem>>(endpoints.list, { query: filters, signal }),
    // Keep the current rows on screen while a new search loads.
    placeholderData: keepPreviousData,
  });
}

export function useGetCustomer(id: string) {
  return useQuery({
    queryKey: customerKeys.detail(id),
    queryFn: ({ signal }) => apiRequest<CustomerDetail>(endpoints.detail(id), { signal }),
    enabled: Boolean(id),
  });
}

/* ---------- mutations ---------- */

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CustomerInput) =>
      apiRequest<CustomerDetail>(endpoints.list, { method: "POST", body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: customerKeys.all }),
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: CustomerInput & { id: string }) =>
      apiRequest<CustomerDetail>(endpoints.detail(id), { method: "PATCH", body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: customerKeys.all }),
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest<{ id: string }>(endpoints.detail(id), { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: customerKeys.all }),
  });
}
