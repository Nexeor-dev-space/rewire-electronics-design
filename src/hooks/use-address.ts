"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api/api-client";
import { API_ENDPOINTS } from "@/lib/api/api-endpoints";
import type { MyAddressesInput, UserAddress } from "@/types/user";

/** The signed-in shopper's saved addresses — `/account/addresses`. */

const addressKeys = {
  all: ["addresses"] as const,
  mine: ["addresses", "mine"] as const,
};

const endpoint = API_ENDPOINTS.account.addresses;

export function useGetMyAddresses() {
  return useQuery({
    queryKey: addressKeys.mine,
    queryFn: ({ signal }) => apiRequest<UserAddress[]>(endpoint, { signal }),
  });
}

/** Saves the full list — addresses left out are removed. */
export function useSaveMyAddresses() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: MyAddressesInput) =>
      apiRequest<UserAddress[]>(endpoint, { method: "PUT", body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: addressKeys.all }),
  });
}
