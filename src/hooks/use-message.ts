"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api/api-client";
import { API_ENDPOINTS } from "@/lib/api/api-endpoints";
import type { Paginated } from "@/lib/api/api-response";
import type { MessageFilters, MessageLogEntry } from "@/types/message";

export const messageKeys = {
  all: ["messages"] as const,
  list: (filters: MessageFilters) => ["messages", "list", filters] as const,
};

export function useGetMessages(filters: MessageFilters, enabled = true) {
  return useQuery({
    queryKey: messageKeys.list(filters),
    queryFn: ({ signal }) =>
      apiRequest<Paginated<MessageLogEntry>>(API_ENDPOINTS.admin.messages.list, { query: filters, signal }),
    placeholderData: keepPreviousData,
    enabled,
  });
}
