import type { ApiErrorBody, ApiResponse } from "./api-response";

/**
 * The fetcher React Query calls. TanStack owns caching and request state;
 * this owns the HTTP call. It returns `data` on success and throws
 * `ApiError` on failure — `fetch` alone resolves happily on a 403 or 422,
 * which would leave `isError` false for exactly the responses that matter.
 */

export class ApiError extends Error {
  constructor(public readonly body: ApiErrorBody) {
    super(body.message);
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  signal?: AbortSignal;
}

export async function apiRequest<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, query, signal } = options;
  const params = query
    ? new URLSearchParams(
        Object.entries(query).flatMap(([k, v]) =>
          v === undefined || v === "" ? [] : [[k, String(v)]],
        ),
      ).toString()
    : "";

  let json: ApiResponse<T>;
  try {
    const res = await fetch(params ? `${url}?${params}` : url, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
    json = await res.json();
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new ApiError({ code: "NETWORK", message: "We couldn't reach the server. Please try again." });
  }

  if (!json.success) throw new ApiError(json.error);
  return json.data;
}

/** Field errors carried by a failed request, or an empty object. */
export function apiFieldErrors(error: unknown): Record<string, string[] | undefined> {
  return error instanceof ApiError ? (error.body.fields ?? {}) : {};
}
