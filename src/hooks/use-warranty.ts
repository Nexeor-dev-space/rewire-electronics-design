"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orderKeys } from "@/hooks/use-order";
import { apiRequest } from "@/lib/api/api-client";
import { API_ENDPOINTS } from "@/lib/api/api-endpoints";
import type { Paginated } from "@/lib/api/api-response";
import type {
  AdminWarrantyClaimDetail,
  AdminWarrantyDetail,
  AdminWarrantyFilters,
  AdminWarrantyRow,
  ClaimStatusChangeInput,
  CreateClaimInput,
  UpdateWarrantyInput,
} from "@/types/warranty";

export const warrantyKeys = {
  all: ["warranties"] as const,
  list: (filters: AdminWarrantyFilters) => ["warranties", "list", filters] as const,
  detail: (id: string) => ["warranties", "detail", id] as const,
  claim: (number: string) => ["warranties", "claim", number] as const,
};

const endpoints = API_ENDPOINTS.admin.warranties;
const claimEndpoints = API_ENDPOINTS.admin.warrantyClaims;

export function useGetWarranties(filters: AdminWarrantyFilters = {}) {
  return useQuery({
    queryKey: warrantyKeys.list(filters),
    queryFn: ({ signal }) => apiRequest<Paginated<AdminWarrantyRow>>(endpoints.list, { query: filters, signal }),
    placeholderData: keepPreviousData,
  });
}

export function useGetWarranty(id: string) {
  return useQuery({
    queryKey: warrantyKeys.detail(id),
    queryFn: ({ signal }) => apiRequest<AdminWarrantyDetail>(endpoints.detail(id), { signal }),
    enabled: Boolean(id),
  });
}

/** The serial and warranty dates also show on the order screens, so those refresh too. */
export function useUpdateWarranty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateWarrantyInput & { id: string }) =>
      apiRequest<AdminWarrantyDetail>(endpoints.detail(id), { method: "PATCH", body: input }),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: warrantyKeys.all }),
        queryClient.invalidateQueries({ queryKey: orderKeys.all }),
      ]),
  });
}

export function useCreateClaim() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: CreateClaimInput & { id: string }) =>
      apiRequest<AdminWarrantyClaimDetail>(endpoints.claims(id), { method: "POST", body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: warrantyKeys.all }),
  });
}

export function useGetClaim(number: string) {
  return useQuery({
    queryKey: warrantyKeys.claim(number),
    queryFn: ({ signal }) => apiRequest<AdminWarrantyClaimDetail>(claimEndpoints.detail(number), { signal }),
    enabled: Boolean(number),
  });
}

export function useChangeClaimStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ number, ...input }: ClaimStatusChangeInput & { number: string }) =>
      apiRequest<AdminWarrantyClaimDetail>(claimEndpoints.status(number), { method: "PATCH", body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: warrantyKeys.all }),
  });
}
