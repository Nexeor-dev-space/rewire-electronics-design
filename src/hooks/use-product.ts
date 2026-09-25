"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api/api-client";
import { API_ENDPOINTS } from "@/lib/api/api-endpoints";
import type { Paginated } from "@/lib/api/api-response";
import type {
  ProductDetail,
  ProductFilters,
  ProductInput,
  ProductListItem,
} from "@/types/product";
import type { ProductStatus } from "@/validators/product.validator";

const productKeys = {
  all: ["products"] as const,
  list: (filters: ProductFilters) => ["products", "list", filters] as const,
  detail: (id: string) => ["products", "detail", id] as const,
};

const inventoryKey = ["inventory"] as const;

const endpoints = API_ENDPOINTS.admin.products;

function useInvalidateProducts() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: productKeys.all }),
      queryClient.invalidateQueries({ queryKey: inventoryKey }),
    ]);
}

/* ---------- queries ---------- */

export function useGetProducts(filters: ProductFilters = {}) {
  return useQuery({
    queryKey: productKeys.list(filters),
    queryFn: ({ signal }) =>
      apiRequest<Paginated<ProductListItem>>(endpoints.list, { query: filters, signal }),
    placeholderData: keepPreviousData,
  });
}

export function useGetProduct(id: string) {
  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: ({ signal }) => apiRequest<ProductDetail>(endpoints.detail(id), { signal }),
    enabled: Boolean(id),
    gcTime: 0,
  });
}

/* ---------- mutations ---------- */

export function useCreateProduct() {
  const invalidate = useInvalidateProducts();
  return useMutation({
    mutationFn: (input: ProductInput) =>
      apiRequest<ProductDetail>(endpoints.list, { method: "POST", body: input }),
    onSuccess: invalidate,
  });
}

export function useUpdateProduct() {
  const invalidate = useInvalidateProducts();
  return useMutation({
    mutationFn: ({ id, ...input }: ProductInput & { id: string }) =>
      apiRequest<ProductDetail>(endpoints.detail(id), { method: "PUT", body: input }),
    onSuccess: invalidate,
  });
}

export function useSetProductStatus() {
  const invalidate = useInvalidateProducts();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ProductStatus }) =>
      apiRequest<ProductDetail>(endpoints.status(id), { method: "PATCH", body: { status } }),
    onSuccess: invalidate,
  });
}

export function useDeleteProduct() {
  const invalidate = useInvalidateProducts();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<{ id: string }>(endpoints.detail(id), { method: "DELETE" }),
    onSuccess: invalidate,
  });
}
