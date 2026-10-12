"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api/api-client";
import { API_ENDPOINTS } from "@/lib/api/api-endpoints";
import type { DeliveryMethod } from "@/lib/delivery";
import type { Emirate } from "@/lib/emirates";
import type {
  AddCartItemInput,
  ApplyCouponInput,
  Cart,
  CartQuote,
  UpdateCartItemInput,
} from "@/types/cart";

export const cartKeys = {
  all: ["cart"] as const,
  detail: ["cart", "detail"] as const,
  quotes: ["cart", "quote"] as const,
  quote: (emirate: Emirate | undefined, method: DeliveryMethod) =>
    ["cart", "quote", emirate, method] as const,
};

const endpoints = API_ENDPOINTS.cart;

/* ---------- queries ---------- */

export function useGetCart() {
  return useQuery({
    queryKey: cartKeys.detail,
    queryFn: ({ signal }) => apiRequest<Cart>(endpoints.root, { signal }),
  });
}

export function useGetCartQuote(emirate: Emirate | undefined, method: DeliveryMethod) {
  return useQuery({
    queryKey: cartKeys.quote(emirate, method),
    queryFn: ({ signal }) =>
      apiRequest<CartQuote>(endpoints.quote, { query: { emirate, method }, signal }),
    enabled: Boolean(emirate),
    // Keep the current quote on screen while emirate/method changes re-price it.
    placeholderData: keepPreviousData,
  });
}

/* ---------- mutations ---------- */

function useCartMutation<TInput>(mutationFn: (input: TInput) => Promise<Cart>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (cart) => {
      queryClient.setQueryData(cartKeys.detail, cart);
      queryClient.invalidateQueries({ queryKey: cartKeys.quotes });
    },
  });
}

export function useAddCartItem() {
  return useCartMutation((input: AddCartItemInput) =>
    apiRequest<Cart>(endpoints.items, { method: "POST", body: input }),
  );
}

export function useUpdateCartItem() {
  return useCartMutation(({ id, ...input }: UpdateCartItemInput & { id: string }) =>
    apiRequest<Cart>(endpoints.item(id), { method: "PATCH", body: input }),
  );
}

export function useRemoveCartItem() {
  return useCartMutation((id: string) => apiRequest<Cart>(endpoints.item(id), { method: "DELETE" }));
}

export function useApplyCoupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ApplyCouponInput) =>
      apiRequest<Cart>(endpoints.coupon, { method: "POST", body: input }),
    onSuccess: (cart) => {
      queryClient.setQueryData(cartKeys.detail, cart);
      queryClient.invalidateQueries({ queryKey: cartKeys.quotes });
    },
    // A wrong or expired code is not a session expiring — never bounce this to /sign-in.
    meta: { authRedirect: false },
  });
}

export function useRemoveCoupon() {
  return useCartMutation(() => apiRequest<Cart>(endpoints.coupon, { method: "DELETE" }));
}

export function useAcknowledgeCart() {
  return useCartMutation(() => apiRequest<Cart>(endpoints.acknowledge, { method: "POST" }));
}
