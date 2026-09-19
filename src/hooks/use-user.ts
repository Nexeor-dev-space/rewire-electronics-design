"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api/api-client";
import { API_ENDPOINTS } from "@/lib/api/api-endpoints";
import type { Paginated } from "@/lib/api/api-response";
import type { UserDetail, UserFilters, UserInput, UserListItem } from "@/types/user";

const userKeys = {
  all: ["users"] as const,
  list: (filters: UserFilters) => ["users", "list", filters] as const,
  detail: (id: string) => ["users", "detail", id] as const,
};

const endpoints = API_ENDPOINTS.admin.users;

/* ---------- queries ---------- */

/** `filters.group` decides which accounts come back: staff, or customers. */
export function useGetUsers(filters: UserFilters) {
  return useQuery({
    queryKey: userKeys.list(filters),
    queryFn: ({ signal }) =>
      apiRequest<Paginated<UserListItem>>(endpoints.list, { query: filters, signal }),
    // Keep the current rows on screen while a new search loads.
    placeholderData: keepPreviousData,
  });
}

export function useGetUser(id: string) {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: ({ signal }) => apiRequest<UserDetail>(endpoints.detail(id), { signal }),
    enabled: Boolean(id),
  });
}

/* ---------- mutations ---------- */

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UserInput) =>
      apiRequest<UserDetail>(endpoints.list, { method: "POST", body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: UserInput & { id: string }) =>
      apiRequest<UserDetail>(endpoints.detail(id), { method: "PATCH", body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest<{ id: string }>(endpoints.detail(id), { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
  });
}
