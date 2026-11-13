"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api/api-client";
import { API_ENDPOINTS } from "@/lib/api/api-endpoints";
import { stockOptions } from "@/lib/shop";
import type { ShopCard, ShopFilterState, ShopListing } from "@/types/catalogue";

const catalogueKeys = {
  all: ["catalogue"] as const,
  list: (filters: ShopFilterState, page: number) => ["catalogue", "list", filters, page] as const,
  wishlist: (slugs: string[]) => ["catalogue", "wishlist", slugs] as const,
};

const ALL_STOCK = stockOptions.map((option) => option.value);

/**
 * `apiRequest` drops empty values, so an unticked Availability group would
 * arrive as "left out" and fall back to the in stock default. Every option
 * ticked means the same to the server as none: no stock filter.
 */
const toQuery = (filters: ShopFilterState) =>
  Object.fromEntries(
    Object.entries({ ...filters, stock: filters.stock.length > 0 ? filters.stock : ALL_STOCK }).map(
      ([key, value]) => [key, Array.isArray(value) ? value.join(",") : value],
    ),
  );

/** One page of the shop grid. Keeps the current page on screen while the next one loads. */
export function useGetShopProducts(
  filters: ShopFilterState,
  page: number,
  initialListing?: ShopListing,
) {
  return useQuery({
    queryKey: catalogueKeys.list(filters, page),
    queryFn: ({ signal }) =>
      apiRequest<ShopListing>(API_ENDPOINTS.products.list, {
        query: { ...toQuery(filters), page },
        signal,
      }),
    initialData: initialListing,
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
