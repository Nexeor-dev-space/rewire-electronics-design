"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api/api-client";
import { API_ENDPOINTS } from "@/lib/api/api-endpoints";
import type {
  IntegrationCredentialInput,
  IntegrationKey,
  IntegrationMode,
  IntegrationStatus,
} from "@/types/integration";

export const integrationKeys = {
  all: ["integrations"] as const,
};

const endpoints = API_ENDPOINTS.admin.integrations;

/* ---------- queries ---------- */

export function useGetIntegrations() {
  return useQuery({
    queryKey: integrationKeys.all,
    queryFn: ({ signal }) => apiRequest<IntegrationStatus>(endpoints.status, { signal }),
  });
}

/* ---------- mutations ---------- */

export function useSetIntegrationMode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (mode: IntegrationMode) =>
      apiRequest<IntegrationStatus>(endpoints.mode, { method: "PUT", body: { mode } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: integrationKeys.all }),
  });
}

export function useSetIntegrationCredential() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: IntegrationCredentialInput) =>
      apiRequest<IntegrationStatus>(endpoints.credential(key), { method: "PUT", body: { value } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: integrationKeys.all }),
  });
}

export function useDeleteIntegrationCredential() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (key: IntegrationKey) =>
      apiRequest<IntegrationStatus>(endpoints.credential(key), { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: integrationKeys.all }),
  });
}
