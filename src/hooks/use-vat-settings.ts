"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { storeSettingsKeys } from "@/hooks/use-store-settings";
import { apiRequest } from "@/lib/api/api-client";
import { API_ENDPOINTS } from "@/lib/api/api-endpoints";
import type { StoreSettingsView } from "@/types/return";
import type { VatSettingsInput } from "@/types/vat";

export const vatSettingsKeys = {
  all: ["vat-settings"] as const,
};

const endpoint = API_ENDPOINTS.admin.vatSettings;

export function useGetVatSettings() {
  return useQuery({
    queryKey: vatSettingsKeys.all,
    queryFn: ({ signal }) => apiRequest<StoreSettingsView>(endpoint, { signal }),
  });
}

export function useUpdateVatSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: VatSettingsInput) =>
      apiRequest<StoreSettingsView>(endpoint, { method: "PUT", body: input }),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: vatSettingsKeys.all }),
        queryClient.invalidateQueries({ queryKey: storeSettingsKeys.all }),
      ]),
  });
}
