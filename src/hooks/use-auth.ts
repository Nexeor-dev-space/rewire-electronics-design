"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api/api-client";
import { API_ENDPOINTS } from "@/lib/api/api-endpoints";
import type {
  ForgotPasswordInput,
  Me,
  ResetPasswordInput,
  SignInInput,
  SignInResult,
  SignUpInput,
  VerifyEmailInput,
} from "@/types/auth";

const authKeys = {
  all: ["auth"] as const,
  me: ["auth", "me"] as const,
};

/* ---------- queries ---------- */

export function useGetMe() {
  return useQuery({
    queryKey: authKeys.me,
    queryFn: ({ signal }) => apiRequest<Me | null>(API_ENDPOINTS.auth.me, { signal }),
  });
}

/* ---------- mutations ---------- */

// A different user means every cached response belongs to someone else.

export function useSignIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SignInInput) =>
      apiRequest<SignInResult>(API_ENDPOINTS.auth.signIn, { method: "POST", body: input }),
    onSuccess: () => queryClient.clear(),
    // A wrong password is not a session expiring — never bounce this to /sign-in.
    meta: { authRedirect: false },
  });
}

export function useSignOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiRequest<{ signedOut: true }>(API_ENDPOINTS.auth.signOut, { method: "POST" }),
    onSuccess: () => queryClient.clear(),
  });
}

export function useSignUp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SignUpInput) =>
      apiRequest<SignInResult>(API_ENDPOINTS.auth.signUp, { method: "POST", body: input }),
    onSuccess: () => queryClient.clear(),
  });
}

export function useVerifyEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: VerifyEmailInput) =>
      apiRequest<{ verified: true }>(API_ENDPOINTS.auth.verifyEmail, { method: "POST", body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: authKeys.all }),
  });
}

export function useResendVerification() {
  return useMutation({
    mutationFn: () =>
      apiRequest<{ sent: true }>(API_ENDPOINTS.auth.resendVerification, { method: "POST" }),
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (input: ForgotPasswordInput) =>
      apiRequest<{ sent: true }>(API_ENDPOINTS.auth.forgotPassword, { method: "POST", body: input }),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (input: ResetPasswordInput) =>
      apiRequest<{ reset: true }>(API_ENDPOINTS.auth.resetPassword, { method: "POST", body: input }),
  });
}
