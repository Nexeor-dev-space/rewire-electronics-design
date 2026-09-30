"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api/api-client";
import { API_ENDPOINTS } from "@/lib/api/api-endpoints";
import type { Emirate } from "@/lib/emirates";
import type { DeliveryZoneInput, DeliveryZoneRow } from "@/types/delivery";

const deliveryZoneKeys = {
  all: ["delivery-zones"] as const,
  list: ["delivery-zones", "list"] as const,
};

const endpoints = API_ENDPOINTS.admin.deliveryZones;

/* ---------- queries ---------- */

export function useGetDeliveryZones() {
  return useQuery({
    queryKey: deliveryZoneKeys.list,
    queryFn: ({ signal }) => apiRequest<DeliveryZoneRow[]>(endpoints.list, { signal }),
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
