"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api/api-client";
import { API_ENDPOINTS } from "@/lib/api/api-endpoints";
import type { Paginated } from "@/lib/api/api-response";
import { MAX_CAMPAIGN_TYPES } from "@/lib/constants";
import type {
  AdminCampaign,
  AdminCampaignListItem,
  AdminCampaignType,
  CampaignFilters,
  CampaignInput,
  CampaignStatusInput,
  CampaignTypeInput,
} from "@/types/campaign";

const campaignKeys = {
  all: ["campaigns"] as const,
  list: (filters: CampaignFilters) => ["campaigns", "list", filters] as const,
  detail: (id: string) => ["campaigns", "detail", id] as const,
  types: ["campaigns", "types"] as const,
};

const endpoints = API_ENDPOINTS.admin.campaigns;

/* ---------- queries ---------- */

export function useGetCampaigns(filters: CampaignFilters = {}) {
  return useQuery({
    queryKey: campaignKeys.list(filters),
    queryFn: ({ signal }) =>
      apiRequest<Paginated<AdminCampaignListItem>>(endpoints.list, { query: filters, signal }),
    placeholderData: keepPreviousData,
  });
}

export function useGetCampaign(id: string) {
  return useQuery({
    queryKey: campaignKeys.detail(id),
    queryFn: ({ signal }) => apiRequest<AdminCampaign>(endpoints.detail(id), { signal }),
    enabled: Boolean(id),
    gcTime: 0,
  });
}

/** Every type: the count is capped at `MAX_CAMPAIGN_TYPES`, so one page holds them all. */
export function useGetCampaignTypes() {
  return useQuery({
    queryKey: campaignKeys.types,
    queryFn: ({ signal }) =>
      apiRequest<Paginated<AdminCampaignType>>(endpoints.types, {
        query: { pageSize: MAX_CAMPAIGN_TYPES },
        signal,
      }),
  });
}

/* ---------- mutations ---------- */

export function useCreateCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CampaignInput) =>
      apiRequest<AdminCampaign>(endpoints.list, { method: "POST", body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: campaignKeys.all }),
  });
}

export function useUpdateCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: CampaignInput & { id: string }) =>
      apiRequest<AdminCampaign>(endpoints.detail(id), { method: "PUT", body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: campaignKeys.all }),
  });
}

export function useSetCampaignStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: CampaignStatusInput & { id: string }) =>
      apiRequest<AdminCampaign>(endpoints.status(id), { method: "PATCH", body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: campaignKeys.all }),
  });
}

export function useDeleteCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<{ id: string }>(endpoints.detail(id), { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: campaignKeys.all }),
  });
}

export function useCreateCampaignType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CampaignTypeInput) =>
      apiRequest<AdminCampaignType>(endpoints.types, { method: "POST", body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: campaignKeys.all }),
  });
}

export function useUpdateCampaignType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: CampaignTypeInput & { id: string }) =>
      apiRequest<AdminCampaignType>(endpoints.type(id), { method: "PUT", body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: campaignKeys.all }),
  });
}

export function useDeleteCampaignType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<{ id: string }>(endpoints.type(id), { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: campaignKeys.all }),
  });
}
