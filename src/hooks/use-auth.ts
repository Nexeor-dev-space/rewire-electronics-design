"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api/api-client";
import { API_ENDPOINTS } from "@/lib/api/api-endpoints";
import type { SignInInput, SignInResult } from "@/types/auth";

/* ---------- mutations ---------- */

// A different user means every cached response belongs to someone else.

export function useSignIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SignInInput) =>
      apiRequest<SignInResult>(API_ENDPOINTS.auth.signIn, { method: "POST", body: input }),
    onSuccess: () => queryClient.clear(),
  });
}

export function useSignOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiRequest<{ signedOut: true }>(API_ENDPOINTS.auth.signOut, { method: "POST" }),
    onSuccess: () => queryClient.clear(),
  });
}
