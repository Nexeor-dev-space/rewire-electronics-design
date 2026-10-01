"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api/api-client";
import { API_ENDPOINTS } from "@/lib/api/api-endpoints";
import type {
  CreateHomepageSectionInput,
  HomepageDraft,
  HomepageSectionInput,
} from "@/types/homepage";

const homepageKeys = {
  all: ["homepage"] as const,
  draft: ["homepage", "draft"] as const,
};

const endpoints = API_ENDPOINTS.admin.homepage;

/* ---------- queries ---------- */

export function useGetHomepageDraft() {
  return useQuery({
    queryKey: homepageKeys.draft,
    queryFn: ({ signal }) => apiRequest<HomepageDraft>(endpoints.draft, { signal }),
  });
}

/* ---------- mutations ---------- */

/**
 * Every homepage route answers with the whole draft, so a success writes it
 * straight into the cache with no refetch. A failure reloads the draft: the
 * usual cause is a list changed in another tab (a stale reorder, a section
 * deleted elsewhere), and the reload shows staff the page as it now is.
 */
function useDraftMutation<TVariables = void>(
  mutationFn: (variables: TVariables) => Promise<HomepageDraft>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (draft) => queryClient.setQueryData(homepageKeys.draft, draft),
    onError: () => {
      void queryClient.invalidateQueries({ queryKey: homepageKeys.all });
    },
  });
}

export function useAddHomepageSection() {
  return useDraftMutation((input: CreateHomepageSectionInput) =>
    apiRequest<HomepageDraft>(endpoints.sections, { method: "POST", body: input }),
  );
}

export function useUpdateHomepageSection() {
  return useDraftMutation(({ id, ...input }: HomepageSectionInput & { id: string }) =>
    apiRequest<HomepageDraft>(endpoints.section(id), { method: "PUT", body: input }),
  );
}

export function useDeleteHomepageSection() {
  return useDraftMutation((id: string) =>
    apiRequest<HomepageDraft>(endpoints.section(id), { method: "DELETE" }),
  );
}

export function useReorderHomepageSections() {
  return useDraftMutation((ids: string[]) =>
    apiRequest<HomepageDraft>(endpoints.order, { method: "PUT", body: { ids } }),
  );
}

export function usePublishHomepage() {
  return useDraftMutation(() => apiRequest<HomepageDraft>(endpoints.publish, { method: "POST" }));
}

export function useDiscardHomepageDraft() {
  return useDraftMutation(() => apiRequest<HomepageDraft>(endpoints.discard, { method: "POST" }));
}
