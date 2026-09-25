"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api/api-client";
import { API_ENDPOINTS } from "@/lib/api/api-endpoints";
import type { Paginated } from "@/lib/api/api-response";
import type { AddOnFilters, AddOnInput, AddOnItem } from "@/types/add-on";

const addOnKeys = {
  all: ["add-ons"] as const,
  list: (filters: AddOnFilters) => ["add-ons", "list", filters] as const,
  detail: (id: string) => ["add-ons", "detail", id] as const,
};

const endpoints = API_ENDPOINTS.admin.addOns;

/* ---------- queries ---------- */

export function useGetAddOns(filters: AddOnFilters = {}) {
  return useQuery({
    queryKey: addOnKeys.list(filters),
    queryFn: ({ signal }) =>
      apiRequest<Paginated<AddOnItem>>(endpoints.list, { query: filters, signal }),
    placeholderData: keepPreviousData,
  });
}

export function useGetAddOn(id: string) {
  return useQuery({
    queryKey: addOnKeys.detail(id),
    queryFn: ({ signal }) => apiRequest<AddOnItem>(endpoints.detail(id), { signal }),
    enabled: Boolean(id),
  });
}

/* ---------- mutations ---------- */

export function useCreateAddOn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AddOnInput) =>
      apiRequest<AddOnItem>(endpoints.list, { method: "POST", body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: addOnKeys.all }),
  });
}

export function useUpdateAddOn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: AddOnInput & { id: string }) =>
      apiRequest<AddOnItem>(endpoints.detail(id), { method: "PUT", body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: addOnKeys.all }),
  });
}

export function useDeleteAddOn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<{ id: string }>(endpoints.detail(id), { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: addOnKeys.all }),
  });
}
