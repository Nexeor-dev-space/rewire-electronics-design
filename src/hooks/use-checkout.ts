"use client";

import { skipToken, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cartKeys } from "@/hooks/use-cart";
import { orderKeys } from "@/hooks/use-order";
import { apiRequest } from "@/lib/api/api-client";
import { API_ENDPOINTS } from "@/lib/api/api-endpoints";
import type { OrderDetail, PlaceOrderInput } from "@/types/order";

export const checkoutKeys = {
  all: ["checkout"] as const,
  placed: (number: string) => ["checkout", "placed", number] as const,
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
      apiRequest<OrderDetail>(API_ENDPOINTS.checkout.place, { method: "POST", body: input }),
    onSuccess: (order) => {
      queryClient.setQueryData(checkoutKeys.placed(order.number), order);
      queryClient.invalidateQueries({ queryKey: cartKeys.all });
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
    },
  });
}
