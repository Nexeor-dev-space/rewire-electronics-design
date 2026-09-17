import type { z } from "zod";
import { fail, ok, type ErrorCode, type Result } from "@/types/result";

/**
 * Shared HTTP client for external/backend APIs. Module services wrap it;
 * components never call `fetch` directly. Every response is validated
 * against a schema, and every failure comes back as a `Result`.
 *
 *   // src/services/orders/order.service.ts
 *   export const getOrder = (id: string) => http("GET", `/api/orders/${id}`, orderSchema);
 */

function codeFor(status: number): ErrorCode {
  if (status === 400 || status === 422) return "VALIDATION";
  if (status === 401 || status === 403) return "UNAUTHORIZED";
  if (status === 404) return "NOT_FOUND";
  if (status === 409) return "CONFLICT";
  return status >= 500 ? "NETWORK" : "UNKNOWN";
}

export async function http<S extends z.ZodType>(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  url: string,
  schema: S,
  { body, ...init }: Omit<RequestInit, "method" | "body"> & { body?: unknown } = {},
): Promise<Result<z.output<S>>> {
  try {
    const response = await fetch(url, {
      ...init,
      method,
      headers: { "Content-Type": "application/json", ...init.headers },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: init.signal ?? AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      return fail(codeFor(response.status), `Request failed (${response.status}).`);
    }

    const parsed = schema.safeParse(response.status === 204 ? null : await response.json());
    return parsed.success
      ? ok(parsed.data)
      : fail("UNKNOWN", "The server sent an unexpected response.");
  } catch {
    return fail("NETWORK", "We couldn't reach the server. Please try again.");
  }
}
