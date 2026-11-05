"use client";

import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api/api-client";
import { API_ENDPOINTS } from "@/lib/api/api-endpoints";
import type { ShopCard, ShopFilterState, ShopListing } from "@/types/catalogue";

const catalogueKeys = {
  all: ["catalogue"] as const,
  list: (filters: ShopFilterState) => ["catalogue", "list", filters] as const,
  wishlist: (slugs: string[]) => ["catalogue", "wishlist", slugs] as const,
};

const toQuery = (filters: ShopFilterState) =>
  Object.fromEntries(
    Object.entries(filters).map(([key, value]) => [key, Array.isArray(value) ? value.join(",") : value]),
  );

export function useGetShopProducts(filters: ShopFilterState, initialListing?: ShopListing) {
  return useInfiniteQuery({
    queryKey: catalogueKeys.list(filters),
    queryFn: ({ pageParam, signal }) =>
      apiRequest<ShopListing>(API_ENDPOINTS.products.list, {
        query: { ...toQuery(filters), page: pageParam },
        signal,
      }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page * last.pageSize < last.total ? last.page + 1 : undefined),
    initialData: initialListing ? { pages: [initialListing], pageParams: [1] } : undefined,
    placeholderData: keepPreviousData,
  });
}

/**
 * Cards for the browser's saved slugs, in saved order. Keeps the current
 * cards on screen while a heart toggle changes the list.
 */
export function useGetWishlistProducts(slugs: string[]) {
  return useQuery({
    queryKey: catalogueKeys.wishlist(slugs),
    queryFn: ({ signal }) =>
      apiRequest<ShopCard[]>(API_ENDPOINTS.wishlist, { query: { slugs: slugs.join(",") }, signal }),
    enabled: slugs.length > 0,
    placeholderData: keepPreviousData,
  });
}
