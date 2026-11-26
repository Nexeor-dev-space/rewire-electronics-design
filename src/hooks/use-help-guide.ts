"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api/api-client";
import { API_ENDPOINTS } from "@/lib/api/api-endpoints";
import type { Guide, GuideAudience } from "@/lib/user-guides/types";
import type { HelpGuideInput } from "@/validators/help-guide.validator";

const helpGuideKeys = {
  all: ["help-guides"] as const,
};

interface Target {
  audience: GuideAudience;
  slug: string;
}

const endpoint = ({ audience, slug }: Target) => API_ENDPOINTS.admin.helpGuides.detail(audience, slug);

/** Saves the whole guide. The server answers with the saved guide. */
export function useSaveHelpGuide() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, ...target }: Target & { input: HelpGuideInput }) =>
      apiRequest<Guide>(endpoint(target), { method: "PUT", body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: helpGuideKeys.all }),
  });
}

/** Removes the staff edits so the built in text shows again. */
export function useResetHelpGuide() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (target: Target) => apiRequest<Guide>(endpoint(target), { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: helpGuideKeys.all }),
  });
}
