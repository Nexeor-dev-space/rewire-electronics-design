"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api/api-client";
import { API_ENDPOINTS } from "@/lib/api/api-endpoints";
import type { Paginated } from "@/lib/api/api-response";
import type { Emirate } from "@/lib/emirates";
import type {
  AdminDeliveryArea,
  DeliveryAreaFilters,
  DeliveryAreaInput,
  DeliveryAreaOptions,
  DeliveryZoneInput,
  DeliveryZoneRow,
} from "@/types/delivery";

const deliveryZoneKeys = {
  all: ["delivery-zones"] as const,
  list: ["delivery-zones", "list"] as const,
};

const deliveryAreaKeys = {
  all: ["delivery-areas"] as const,
  list: (filters: DeliveryAreaFilters) => ["delivery-areas", "list", filters] as const,
  options: (emirate: Emirate) => ["delivery-areas", "options", emirate] as const,
};

const endpoints = API_ENDPOINTS.admin.deliveryZones;
const areaEndpoints = API_ENDPOINTS.admin.deliveryAreas;

/* ---------- queries ---------- */

export function useGetDeliveryZones() {
  return useQuery({
    queryKey: deliveryZoneKeys.list,
    queryFn: ({ signal }) => apiRequest<DeliveryZoneRow[]>(endpoints.list, { signal }),
  });
}

export function useGetDeliveryAreas(filters: DeliveryAreaFilters = {}) {
  return useQuery({
    queryKey: deliveryAreaKeys.list(filters),
    queryFn: ({ signal }) =>
      apiRequest<Paginated<AdminDeliveryArea>>(areaEndpoints.list, { query: filters, signal }),
    placeholderData: keepPreviousData,
  });
}

/** Storefront: the checkout's area dropdown for one emirate. */
export function useGetDeliveryAreaOptions(emirate: Emirate) {
  return useQuery({
    queryKey: deliveryAreaKeys.options(emirate),
    queryFn: ({ signal }) =>
      apiRequest<DeliveryAreaOptions>(API_ENDPOINTS.deliveryAreas, { query: { emirate }, signal }),
  });
}

/* ---------- mutations ---------- */

export function useUpdateDeliveryZone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ emirate, ...input }: DeliveryZoneInput & { emirate: Emirate }) =>
      apiRequest<DeliveryZoneRow>(endpoints.detail(emirate), { method: "PUT", body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: deliveryZoneKeys.all }),
  });
}

export function useCreateDeliveryArea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: DeliveryAreaInput) =>
      apiRequest<AdminDeliveryArea>(areaEndpoints.list, { method: "POST", body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: deliveryAreaKeys.all }),
  });
}

export function useUpdateDeliveryArea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: DeliveryAreaInput & { id: string }) =>
      apiRequest<AdminDeliveryArea>(areaEndpoints.detail(id), { method: "PUT", body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: deliveryAreaKeys.all }),
  });
}
