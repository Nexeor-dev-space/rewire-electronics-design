"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api/api-client";
import { API_ENDPOINTS } from "@/lib/api/api-endpoints";
import type { StaffPermissions } from "@/types/role";

const roleKeys = {
  all: ["roles"] as const,
  staff: ["roles", "staff"] as const,
};

const endpoints = API_ENDPOINTS.admin.roles;

/* ---------- queries ---------- */

export function useGetStaffPermissions() {
  return useQuery({
    queryKey: roleKeys.staff,
    queryFn: ({ signal }) => apiRequest<StaffPermissions>(endpoints.staff, { signal }),
  });
}

/* ---------- mutations ---------- */

export function useSaveStaffPermissions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: StaffPermissions) =>
      apiRequest<StaffPermissions>(endpoints.staff, { method: "PUT", body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: roleKeys.all }),
  });
}
