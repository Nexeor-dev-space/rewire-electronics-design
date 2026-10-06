"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api/api-client";
import { API_ENDPOINTS } from "@/lib/api/api-endpoints";
import { SEARCH_MIN_QUERY_LENGTH } from "@/lib/constants";
import type { SearchSuggestions } from "@/types/catalogue";

const searchKeys = {
  suggestions: (q: string) => ["search", "suggestions", q] as const,
};

/** Pass the debounced query; shorter than the minimum, nothing is fetched. */
export function useSearchSuggestions(q: string) {
  return useQuery({
    queryKey: searchKeys.suggestions(q),
    queryFn: ({ signal }) =>
      apiRequest<SearchSuggestions>(API_ENDPOINTS.search, { query: { q }, signal }),
    enabled: q.length >= SEARCH_MIN_QUERY_LENGTH,
    placeholderData: keepPreviousData,
  });
}
