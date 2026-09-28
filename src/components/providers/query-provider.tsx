"use client";

import { useState, type ReactNode } from "react";
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApiError } from "@/lib/api/api-client";
import { signInHref } from "@/lib/auth/next-path";
import { SIGN_IN_PAGE_PATH } from "@/lib/constants";

/**
 * TanStack Query — client-side fetching, caching, retry and refetch.
 *
 * The client is created once per browser session inside `useState`, never at
 * module level, so server renders never share a cache between requests.
 * Server Components keep fetching through services directly; this is for
 * client components that load or mutate data interactively.
 */

/**
 * Any API — storefront or admin — answering `UNAUTHENTICATED` means the
 * session cookie is gone or expired. Send the browser to sign in with a
 * `next` back to where it was, unless the caller opted out (a wrong
 * password on the sign-in form is not a session expiring) or we're
 * already there.
 */
function handleAuthError(error: unknown, meta: Record<string, unknown> | undefined) {
  if (!(error instanceof ApiError)) return;
  if (error.body.code !== "UNAUTHENTICATED") return;
  if (meta?.authRedirect === false) return;
  if (typeof window === "undefined") return;
  if (window.location.pathname === SIGN_IN_PAGE_PATH) return;

  window.location.assign(signInHref(window.location.pathname + window.location.search));
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error, query) => handleAuthError(error, query.meta),
        }),
        mutationCache: new MutationCache({
          onError: (error, _variables, _context, mutation) => handleAuthError(error, mutation.meta),
        }),
        defaultOptions: {
          queries: {
            // Avoid an immediate refetch of data that just arrived.
            staleTime: 60_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
          mutations: { retry: 0 },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
