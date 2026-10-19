"use client";

import { skipToken, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cartKeys } from "@/hooks/use-cart";
import { orderKeys } from "@/hooks/use-order";
import { apiRequest } from "@/lib/api/api-client";
import { API_ENDPOINTS } from "@/lib/api/api-endpoints";
import type { OrderDetail, PlaceOrderInput, PlacedOrder } from "@/types/order";

export const checkoutKeys = {
  all: ["checkout"] as const,
  placed: (number: string) => ["checkout", "placed", number] as const,
  payment: (sessionId: string) => ["checkout", "payment", sessionId] as const,
};

export function usePlacedOrder(number: string) {
  return useQuery<OrderDetail>({
    queryKey: checkoutKeys.placed(number),
    queryFn: skipToken,
    staleTime: Infinity,
  });
}

export function usePlaceOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PlaceOrderInput) =>
      apiRequest<PlacedOrder>(API_ENDPOINTS.checkout.place, { method: "POST", body: input }),
    onSuccess: ({ order }) => {
      queryClient.setQueryData(checkoutKeys.placed(order.number), order);
      queryClient.invalidateQueries({ queryKey: cartKeys.all });
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
    },
  });
}

/** Back from Stripe: asks the server to check the session, which marks the order paid. */
export function useConfirmPayment(sessionId: string) {
  return useQuery({
    queryKey: checkoutKeys.payment(sessionId),
    queryFn: ({ signal }) =>
      apiRequest<OrderDetail>(API_ENDPOINTS.checkout.confirmPayment, {
        method: "POST",
        body: { sessionId },
        signal,
      }),
    enabled: Boolean(sessionId),
    retry: false,
    staleTime: Infinity,
  });
}
