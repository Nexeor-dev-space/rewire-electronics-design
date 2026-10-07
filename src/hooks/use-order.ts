"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api/api-client";
import { API_ENDPOINTS } from "@/lib/api/api-endpoints";
import type { Paginated } from "@/lib/api/api-response";
import type {
  AdminOrderDetail,
  AdminOrderFilters,
  AdminOrderRow,
  FulfilmentFilters,
  FulfilmentUpdateInput,
  OrderDetail,
  OrderPaymentInput,
  OrderStatusChangeInput,
  OrderSummary,
  TrackOrderInput,
  UpdateOrderInput,
} from "@/types/order";

export const orderKeys = {
  all: ["orders"] as const,
  accountList: (page: number) => ["orders", "account", "list", page] as const,
  accountDetail: (number: string) => ["orders", "account", "detail", number] as const,
  tracked: (number: string, email: string) => ["orders", "tracked", number, email] as const,
  adminList: (filters: AdminOrderFilters) => ["orders", "admin", "list", filters] as const,
  adminDetail: (number: string) => ["orders", "admin", "detail", number] as const,
  fulfilment: (filters: FulfilmentFilters) => ["orders", "fulfilment", filters] as const,
};

/* ---------- storefront queries ---------- */

export function useGetAccountOrders(page = 1) {
  return useQuery({
    queryKey: orderKeys.accountList(page),
    queryFn: ({ signal }) =>
      apiRequest<Paginated<OrderSummary>>(API_ENDPOINTS.account.orders, { query: { page }, signal }),
    placeholderData: keepPreviousData,
  });
}

export function useGetAccountOrder(number: string) {
  return useQuery({
    queryKey: orderKeys.accountDetail(number),
    queryFn: ({ signal }) => apiRequest<OrderDetail>(API_ENDPOINTS.account.order(number), { signal }),
    enabled: Boolean(number),
  });
}

export function useGetTrackedOrder({ number, email }: TrackOrderInput) {
  return useQuery({
    queryKey: orderKeys.tracked(number, email),
    queryFn: ({ signal }) =>
      apiRequest<OrderDetail>(API_ENDPOINTS.orders.track, {
        method: "POST",
        body: { number, email },
        signal,
      }),
    enabled: Boolean(number && email),
    retry: false,
  });
}

/* ---------- admin queries ---------- */

export function useGetAdminOrders(filters: AdminOrderFilters = {}) {
  return useQuery({
    queryKey: orderKeys.adminList(filters),
    queryFn: ({ signal }) =>
      apiRequest<Paginated<AdminOrderRow>>(API_ENDPOINTS.admin.orders.list, { query: filters, signal }),
    placeholderData: keepPreviousData,
  });
}

export function useGetAdminOrder(number: string) {
  return useQuery({
    queryKey: orderKeys.adminDetail(number),
    queryFn: ({ signal }) =>
      apiRequest<AdminOrderDetail>(API_ENDPOINTS.admin.orders.detail(number), { signal }),
    enabled: Boolean(number),
  });
}

export function useGetFulfilmentOrders(filters: FulfilmentFilters = {}) {
  return useQuery({
    queryKey: orderKeys.fulfilment(filters),
    queryFn: ({ signal }) =>
      apiRequest<Paginated<AdminOrderRow>>(API_ENDPOINTS.admin.fulfilment.list, {
        query: filters,
        signal,
      }),
    placeholderData: keepPreviousData,
  });
}

/* ---------- admin mutations ---------- */

function useOrderMutation<TInput, TResult>(mutationFn: (input: TInput) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: orderKeys.all }),
  });
}

export function useUpdateOrder() {
  return useOrderMutation(({ number, ...input }: UpdateOrderInput & { number: string }) =>
    apiRequest<AdminOrderDetail>(API_ENDPOINTS.admin.orders.detail(number), {
      method: "PATCH",
      body: input,
    }),
  );
}

export function useChangeOrderStatus() {
  return useOrderMutation(({ number, ...input }: OrderStatusChangeInput & { number: string }) =>
    apiRequest<AdminOrderDetail>(API_ENDPOINTS.admin.orders.status(number), {
      method: "PATCH",
      body: input,
    }),
  );
}

export function useChangeOrderPayment() {
  return useOrderMutation(({ number, ...input }: OrderPaymentInput & { number: string }) =>
    apiRequest<AdminOrderDetail>(API_ENDPOINTS.admin.orders.payment(number), {
      method: "PATCH",
      body: input,
    }),
  );
}

export function useUpdateFulfilment() {
  return useOrderMutation(({ number, ...input }: FulfilmentUpdateInput & { number: string }) =>
    apiRequest<AdminOrderRow>(API_ENDPOINTS.admin.fulfilment.detail(number), {
      method: "PATCH",
      body: input,
    }),
  );
}
