"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api/api-client";
import { API_ENDPOINTS } from "@/lib/api/api-endpoints";
import type { StoreSettingsInput, StoreSettingsView } from "@/types/return";

export const storeSettingsKeys = {
  all: ["store-settings"] as const,
};

const endpoint = API_ENDPOINTS.admin.storeSettings;

export function useGetStoreSettings() {
  return useQuery({
    queryKey: storeSettingsKeys.all,
    queryFn: ({ signal }) => apiRequest<StoreSettingsView>(endpoint, { signal }),
  });
}

export function useUpdateStoreSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: StoreSettingsInput) =>
      apiRequest<StoreSettingsView>(endpoint, { method: "PUT", body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: storeSettingsKeys.all }),
  });
}
