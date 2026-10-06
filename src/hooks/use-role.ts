"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api/api-client";
import { API_ENDPOINTS } from "@/lib/api/api-endpoints";
import type { Paginated } from "@/lib/api/api-response";
import type { StaffRoleDetail, StaffRoleFilters, StaffRoleInput, StaffRoleListItem } from "@/types/role";

const roleKeys = {
  all: ["roles"] as const,
  list: (filters: StaffRoleFilters) => ["roles", "list", filters] as const,
  detail: (id: string) => ["roles", "detail", id] as const,
};

const endpoints = API_ENDPOINTS.admin.roles;

/* ---------- queries ---------- */

export function useGetStaffRoles(filters: StaffRoleFilters = {}) {
  return useQuery({
    queryKey: roleKeys.list(filters),
    queryFn: ({ signal }) =>
      apiRequest<Paginated<StaffRoleListItem>>(endpoints.list, { query: filters, signal }),
    placeholderData: keepPreviousData,
  });
}

export function useGetStaffRole(id: string) {
  return useQuery({
    queryKey: roleKeys.detail(id),
    queryFn: ({ signal }) => apiRequest<StaffRoleDetail>(endpoints.detail(id), { signal }),
    enabled: Boolean(id),
    gcTime: 0,
  });
}

/* ---------- mutations ---------- */

export function useCreateStaffRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: StaffRoleInput) =>
      apiRequest<StaffRoleDetail>(endpoints.list, { method: "POST", body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: roleKeys.all }),
  });
}

export function useUpdateStaffRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: StaffRoleInput & { id: string }) =>
      apiRequest<StaffRoleDetail>(endpoints.detail(id), { method: "PUT", body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: roleKeys.all }),
  });
}

export function useDeleteStaffRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest<{ id: string }>(endpoints.detail(id), { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: roleKeys.all }),
  });
}
