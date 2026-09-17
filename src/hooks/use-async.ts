"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AppError, Result } from "@/types/result";

export type AsyncStatus = "idle" | "loading" | "success" | "empty" | "error";

/**
 * useAsync — the standard client pattern for a `Result`-returning call.
 * Gives one explicit status for loading / success / empty / error, plus
 * `retry` to re-run the last call.
 *
 *   const orders = useAsync(getOrders, { immediate: true });
 *   if (orders.status === "loading") return <Skeleton />;
 *   if (orders.status === "error")   return <Error message={orders.error.message} onRetry={orders.retry} />;
 *   if (orders.status === "empty")   return <Empty />;
 */
export function useAsync<Args extends unknown[], T>(
  fn: (...args: Args) => Promise<Result<T>>,
  { immediate = false, isEmpty = defaultIsEmpty }: { immediate?: boolean; isEmpty?: (data: T) => boolean } = {},
) {
  const [status, setStatus] = useState<AsyncStatus>(immediate ? "loading" : "idle");
  const [data, setData] = useState<T>();
  const [error, setError] = useState<AppError>();
  const lastArgs = useRef<Args>([] as unknown as Args);

  const run = useCallback(
    async (...args: Args) => {
      lastArgs.current = args;
      setStatus("loading");
      setError(undefined);

      let result: Result<T>;
      try {
        result = await fn(...args);
      } catch {
        result = { ok: false, error: { code: "NETWORK", message: "We couldn't reach the server. Please try again." } };
      }

      if (result.ok) {
        setData(result.data);
        setStatus(isEmpty(result.data) ? "empty" : "success");
      } else {
        setError(result.error);
        setStatus("error");
      }
      return result;
    },
    [fn, isEmpty],
  );

  const retry = useCallback(() => run(...lastArgs.current), [run]);

  useEffect(() => {
    if (immediate) void run(...lastArgs.current);
    // Run once on mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { status, data, error, run, retry };
}

function defaultIsEmpty(data: unknown): boolean {
  return data == null || (Array.isArray(data) && data.length === 0);
}
