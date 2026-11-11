"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api/api-client";
import { API_ENDPOINTS } from "@/lib/api/api-endpoints";
import type { NavigationConfig, NavigationDraft, NavigationOptions } from "@/types/navigation";

const navigationKey = ["navigation", "draft"] as const;
const endpoints = API_ENDPOINTS.admin.navigation;

export function useGetNavigationDraft() {
  return useQuery({
    queryKey: navigationKey,
    queryFn: ({ signal }) => apiRequest<NavigationDraft>(endpoints.draft, { signal }),
  });
}

/** Every route answers with the whole draft, so a success writes it into the cache. */
function useNavigationMutation<TVariables = void>(
  mutationFn: (variables: TVariables) => Promise<NavigationDraft>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (result) => queryClient.setQueryData(navigationKey, result),
  });
}

export function useSaveNavigationDraft() {
  return useNavigationMutation((config: NavigationConfig) =>
    apiRequest<NavigationDraft>(endpoints.draft, { method: "PUT", body: config }),
  );
}

export function usePublishNavigation() {
  return useNavigationMutation(() =>
    apiRequest<NavigationDraft>(endpoints.publish, { method: "POST" }),
  );
}

export function useRestoreNavigation() {
  return useNavigationMutation(() =>
    apiRequest<NavigationDraft>(endpoints.restore, { method: "POST" }),
  );
}

export function useDiscardNavigationDraft() {
  return useNavigationMutation(() =>
    apiRequest<NavigationDraft>(endpoints.discard, { method: "POST" }),
  );
}

/** The categories and upcoming drops staff can show, hide and order. */
export function useGetNavigationOptions() {
  return useQuery({
    queryKey: ["navigation", "options"] as const,
    queryFn: ({ signal }) => apiRequest<NavigationOptions>(endpoints.options, { signal }),
  });
}
