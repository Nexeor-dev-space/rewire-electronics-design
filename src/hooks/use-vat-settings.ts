"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { storeSettingsKeys } from "@/hooks/use-store-settings";
import { apiRequest } from "@/lib/api/api-client";
import { API_ENDPOINTS } from "@/lib/api/api-endpoints";
import type { StoreSettingsView } from "@/types/return";
import type { InvoiceSettingsInput, InvoiceSettingsView } from "@/types/invoice";
import type { VatSettingsInput } from "@/types/vat";

export const vatSettingsKeys = {
  all: ["vat-settings"] as const,
  invoice: ["vat-settings", "invoice"] as const,
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

/* ---------- invoice seller details ---------- */

export function useGetInvoiceSettings() {
  return useQuery({
    queryKey: vatSettingsKeys.invoice,
    queryFn: ({ signal }) => apiRequest<InvoiceSettingsView>(API_ENDPOINTS.admin.invoiceSettings, { signal }),
  });
}

export function useUpdateInvoiceSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: InvoiceSettingsInput) =>
      apiRequest<InvoiceSettingsView>(API_ENDPOINTS.admin.invoiceSettings, { method: "PUT", body: input }),
    onSuccess: (saved) => queryClient.setQueryData(vatSettingsKeys.invoice, saved),
  });
}
