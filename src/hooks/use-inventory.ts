"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api/api-client";
import { API_ENDPOINTS } from "@/lib/api/api-endpoints";
import type { Paginated } from "@/lib/api/api-response";
import type { InventoryFilters, InventoryItem } from "@/types/inventory";

const inventoryKeys = {
  all: ["inventory"] as const,
  list: (filters: InventoryFilters) => ["inventory", "list", filters] as const,
};

const productsKey = ["products"] as const;

const endpoints = API_ENDPOINTS.admin.inventory;

export function useGetInventory(filters: InventoryFilters = {}) {
  return useQuery({
    queryKey: inventoryKeys.list(filters),
    queryFn: ({ signal }) =>
      apiRequest<Paginated<InventoryItem>>(endpoints.list, { query: filters, signal }),
    placeholderData: keepPreviousData,
  });
}

export function useSetStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ variantId, stock }: { variantId: string; stock: number }) =>
      apiRequest<InventoryItem>(endpoints.detail(variantId), { method: "PATCH", body: { stock } }),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: inventoryKeys.all }),
        queryClient.invalidateQueries({ queryKey: productsKey }),
      ]),
  });
}
