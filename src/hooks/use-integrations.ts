"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api/api-client";
import { API_ENDPOINTS } from "@/lib/api/api-endpoints";
import type {
  IdIntegrationKey,
  IntegrationKey,
  IntegrationValueInput,
  IntegrationView,
} from "@/types/integration";

export const integrationKeys = {
  all: ["integrations"] as const,
};

const endpoints = API_ENDPOINTS.admin.integrations;

export function useGetIntegrations() {
  return useQuery({
    queryKey: integrationKeys.all,
    queryFn: ({ signal }) => apiRequest<IntegrationView[]>(endpoints.list, { signal }),
  });
}

export function useUpdateIntegration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, ...input }: IntegrationValueInput & { key: IdIntegrationKey }) =>
      apiRequest<IntegrationView>(endpoints.detail(key), { method: "PUT", body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: integrationKeys.all }),
  });
}

export function useTestIntegration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (key: IntegrationKey) => apiRequest<IntegrationView>(endpoints.test(key), { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: integrationKeys.all }),
  });
}
