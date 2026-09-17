"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * TanStack Query — client-side fetching, caching, retry and refetch.
 *
 * The client is created once per browser session inside `useState`, never at
 * module level, so server renders never share a cache between requests.
 * Server Components keep fetching through services directly; this is for
 * client components that load or mutate data interactively.
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
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
