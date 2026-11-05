"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api/api-client";
import { API_ENDPOINTS } from "@/lib/api/api-endpoints";
import type { Paginated } from "@/lib/api/api-response";
import type {
  CreateTicketInput,
  TicketAssignee,
  TicketAssignInput,
  TicketCategoryInput,
  TicketCategoryView,
  TicketDetail,
  TicketFilters,
  TicketMessageInput,
  TicketPriorityInput,
  TicketRow,
  TicketStatusInput,
} from "@/types/support";

export const supportKeys = {
  all: ["support"] as const,
  list: (filters: TicketFilters) => ["support", "list", filters] as const,
  detail: (number: string) => ["support", "detail", number] as const,
  categories: ["support", "categories"] as const,
  assignees: ["support", "assignees"] as const,
};

const endpoints = API_ENDPOINTS.admin.support;

/* ---------- queries ---------- */

export function useGetTickets(filters: TicketFilters = {}) {
  return useQuery({
    queryKey: supportKeys.list(filters),
    queryFn: ({ signal }) => apiRequest<Paginated<TicketRow>>(endpoints.list, { query: filters, signal }),
    placeholderData: keepPreviousData,
  });
}

export function useGetTicket(number: string) {
  return useQuery({
    queryKey: supportKeys.detail(number),
    queryFn: ({ signal }) => apiRequest<TicketDetail>(endpoints.detail(number), { signal }),
    enabled: Boolean(number),
  });
}

export function useGetTicketCategories() {
  return useQuery({
    queryKey: supportKeys.categories,
    queryFn: ({ signal }) => apiRequest<TicketCategoryView[]>(endpoints.categories, { signal }),
  });
}

export function useGetTicketAssignees() {
  return useQuery({
    queryKey: supportKeys.assignees,
    queryFn: ({ signal }) => apiRequest<TicketAssignee[]>(endpoints.assignees, { signal }),
  });
}

/* ---------- mutations ---------- */

function useInvalidateSupport() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: supportKeys.all });
}

export function useCreateTicket() {
  const invalidate = useInvalidateSupport();
  return useMutation({
    mutationFn: (input: CreateTicketInput) =>
      apiRequest<TicketDetail>(endpoints.list, { method: "POST", body: input }),
    onSuccess: invalidate,
  });
}

export function useAddTicketMessage() {
  const invalidate = useInvalidateSupport();
  return useMutation({
    mutationFn: ({ number, ...input }: TicketMessageInput & { number: string }) =>
      apiRequest<TicketDetail>(endpoints.messages(number), { method: "POST", body: input }),
    onSuccess: invalidate,
  });
}

export function useChangeTicketStatus() {
  const invalidate = useInvalidateSupport();
  return useMutation({
    mutationFn: ({ number, ...input }: TicketStatusInput & { number: string }) =>
      apiRequest<TicketDetail>(endpoints.status(number), { method: "PATCH", body: input }),
    onSuccess: invalidate,
  });
}

export function useChangeTicketPriority() {
  const invalidate = useInvalidateSupport();
  return useMutation({
    mutationFn: ({ number, ...input }: TicketPriorityInput & { number: string }) =>
      apiRequest<TicketDetail>(endpoints.priority(number), { method: "PATCH", body: input }),
    onSuccess: invalidate,
  });
}

export function useAssignTicket() {
  const invalidate = useInvalidateSupport();
  return useMutation({
    mutationFn: ({ number, ...input }: TicketAssignInput & { number: string }) =>
      apiRequest<TicketDetail>(endpoints.assignee(number), { method: "PATCH", body: input }),
    onSuccess: invalidate,
  });
}

export function useCreateTicketCategory() {
  const invalidate = useInvalidateSupport();
  return useMutation({
    mutationFn: (input: TicketCategoryInput) =>
      apiRequest<TicketCategoryView>(endpoints.categories, { method: "POST", body: input }),
    onSuccess: invalidate,
  });
}

export function useUpdateTicketCategory() {
  const invalidate = useInvalidateSupport();
  return useMutation({
    mutationFn: ({ id, ...input }: TicketCategoryInput & { id: string }) =>
      apiRequest<TicketCategoryView>(endpoints.category(id), { method: "PATCH", body: input }),
    onSuccess: invalidate,
  });
}
