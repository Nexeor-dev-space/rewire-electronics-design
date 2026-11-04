"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api/api-client";
import { API_ENDPOINTS } from "@/lib/api/api-endpoints";
import type { Paginated } from "@/lib/api/api-response";
import type {
  JoinWaitlistInput,
  MyWaitlistEntry,
  UpdateWaitlistInput,
  WaitlistConfirmResult,
  WaitlistJoinResult,
  WaitlistTokenInput,
} from "@/types/storefront-release";

export const waitlistKeys = {
  all: ["waitlist"] as const,
  mine: (page: number) => ["waitlist", "mine", page] as const,
};

const endpoints = API_ENDPOINTS.waitlist;

function useInvalidateWaitlists() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: waitlistKeys.all });
}

export function useGetMyWaitlists(page = 1) {
  return useQuery({
    queryKey: waitlistKeys.mine(page),
    queryFn: ({ signal }) => apiRequest<Paginated<MyWaitlistEntry>>(endpoints.mine, { query: { page }, signal }),
    placeholderData: keepPreviousData,
  });
}

export function useJoinWaitlist() {
  const invalidate = useInvalidateWaitlists();
  return useMutation({
    mutationFn: ({ slug, ...input }: JoinWaitlistInput & { slug: string }) =>
      apiRequest<WaitlistJoinResult>(API_ENDPOINTS.storefrontReleases.waitlist(slug), { method: "POST", body: input }),
    onSuccess: invalidate,
    meta: { authRedirect: false },
  });
}

export function useConfirmWaitlist() {
  const invalidate = useInvalidateWaitlists();
  return useMutation({
    mutationFn: (input: WaitlistTokenInput) =>
      apiRequest<WaitlistConfirmResult>(endpoints.confirm, { method: "POST", body: input }),
    onSuccess: invalidate,
    meta: { authRedirect: false },
  });
}

export function useLeaveWaitlist() {
  const invalidate = useInvalidateWaitlists();
  return useMutation({
    mutationFn: (input: WaitlistTokenInput) =>
      apiRequest<{ left: true }>(endpoints.leave, { method: "POST", body: input }),
    onSuccess: invalidate,
    meta: { authRedirect: false },
  });
}

export function useUpdateMyWaitlist() {
  const invalidate = useInvalidateWaitlists();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateWaitlistInput & { id: string }) =>
      apiRequest<MyWaitlistEntry>(endpoints.entry(id), { method: "PATCH", body: input }),
    onSuccess: invalidate,
  });
}

export function useDeleteMyWaitlist() {
  const invalidate = useInvalidateWaitlists();
  return useMutation({
    mutationFn: (id: string) => apiRequest<{ id: string }>(endpoints.entry(id), { method: "DELETE" }),
    onSuccess: invalidate,
  });
}
