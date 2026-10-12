"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api/api-client";
import { API_ENDPOINTS } from "@/lib/api/api-endpoints";
import type { Paginated } from "@/lib/api/api-response";
import { orderKeys } from "@/hooks/use-order";
import type {
  AccountReturnFilters,
  AdminReturnDetail,
  AdminReturnFilters,
  AdminReturnRow,
  CreateReturnInput,
  CustomerReturn,
  EligibleReturnOrder,
  RecordRefundInput,
  ReturnStatusChangeInput,
} from "@/types/return";

export const returnKeys = {
  all: ["returns"] as const,
  accountList: (filters: AccountReturnFilters) => ["returns", "account", "list", filters] as const,
  eligible: (page: number) => ["returns", "account", "eligible", page] as const,
  adminList: (filters: AdminReturnFilters) => ["returns", "admin", "list", filters] as const,
  adminDetail: (number: string) => ["returns", "admin", "detail", number] as const,
};

const endpoints = API_ENDPOINTS.admin.returns;

/* ---------- account ---------- */

export function useGetAccountReturns(filters: AccountReturnFilters = {}) {
  return useQuery({
    queryKey: returnKeys.accountList(filters),
    queryFn: ({ signal }) =>
      apiRequest<Paginated<CustomerReturn>>(API_ENDPOINTS.account.returns, { query: filters, signal }),
    placeholderData: keepPreviousData,
  });
}

export function useGetReturnEligibleOrders(page = 1) {
  return useQuery({
    queryKey: returnKeys.eligible(page),
    queryFn: ({ signal }) =>
      apiRequest<Paginated<EligibleReturnOrder>>(API_ENDPOINTS.account.returnsEligible, {
        query: { page },
        signal,
      }),
    placeholderData: keepPreviousData,
  });
}

export function useCreateReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateReturnInput) =>
      apiRequest<CustomerReturn>(API_ENDPOINTS.account.returns, { method: "POST", body: input }),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: returnKeys.all }),
        queryClient.invalidateQueries({ queryKey: orderKeys.all }),
      ]),
  });
}

/* ---------- admin ---------- */

export function useGetAdminReturns(filters: AdminReturnFilters = {}) {
  return useQuery({
    queryKey: returnKeys.adminList(filters),
    queryFn: ({ signal }) =>
      apiRequest<Paginated<AdminReturnRow>>(endpoints.list, { query: filters, signal }),
    placeholderData: keepPreviousData,
  });
}

export function useGetAdminReturn(number: string) {
  return useQuery({
    queryKey: returnKeys.adminDetail(number),
    queryFn: ({ signal }) => apiRequest<AdminReturnDetail>(endpoints.detail(number), { signal }),
    enabled: Boolean(number),
  });
}

export function useChangeReturnStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ number, ...input }: ReturnStatusChangeInput & { number: string }) =>
      apiRequest<AdminReturnDetail>(endpoints.status(number), { method: "PATCH", body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: returnKeys.all }),
  });
}

export function useRecordRefund() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ number, ...input }: RecordRefundInput & { number: string }) =>
      apiRequest<AdminReturnDetail>(endpoints.refund(number), { method: "POST", body: input }),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: returnKeys.all }),
        queryClient.invalidateQueries({ queryKey: orderKeys.all }),
      ]),
  });
}
