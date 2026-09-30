"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api/api-client";
import { API_ENDPOINTS } from "@/lib/api/api-endpoints";
import type { Paginated } from "@/lib/api/api-response";
import type { AdminCoupon, CouponFilters, CouponInput } from "@/types/coupon";

const couponKeys = {
  all: ["coupons"] as const,
  list: (filters: CouponFilters) => ["coupons", "list", filters] as const,
  detail: (id: string) => ["coupons", "detail", id] as const,
};

const endpoints = API_ENDPOINTS.admin.coupons;

/* ---------- queries ---------- */

export function useGetCoupons(filters: CouponFilters = {}) {
  return useQuery({
    queryKey: couponKeys.list(filters),
    queryFn: ({ signal }) =>
      apiRequest<Paginated<AdminCoupon>>(endpoints.list, { query: filters, signal }),
    placeholderData: keepPreviousData,
  });
}

export function useGetCoupon(id: string) {
  return useQuery({
    queryKey: couponKeys.detail(id),
    queryFn: ({ signal }) => apiRequest<AdminCoupon>(endpoints.detail(id), { signal }),
    enabled: Boolean(id),
    gcTime: 0,
  });
}

/* ---------- mutations ---------- */

export function useCreateCoupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CouponInput) =>
      apiRequest<AdminCoupon>(endpoints.list, { method: "POST", body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: couponKeys.all }),
  });
}

export function useUpdateCoupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: CouponInput & { id: string }) =>
      apiRequest<AdminCoupon>(endpoints.detail(id), { method: "PUT", body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: couponKeys.all }),
  });
}

export function useDeleteCoupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<{ id: string }>(endpoints.detail(id), { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: couponKeys.all }),
  });
}
