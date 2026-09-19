import { NextResponse } from "next/server";

/**
 * The one response shape every API route returns — see docs/DATA-LAYER.md §4.
 * Routes return through `apiSuccess` / `apiError`, never `NextResponse.json`.
 */

export type ErrorCode =
  | "VALIDATION" // 422
  | "UNAUTHENTICATED" // 401
  | "FORBIDDEN" // 403
  | "NOT_FOUND" // 404
  | "CONFLICT" // 409
  | "INTERNAL"; // 500

export interface ApiErrorBody {
  code: ErrorCode | "NETWORK";
  message: string;
  fields?: Record<string, string[] | undefined>;
}

export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: ApiErrorBody };

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json<ApiResponse<T>>({ success: true, data }, { status });
}

export function apiError(
  code: ErrorCode,
  message: string,
  status: number,
  fields?: ApiErrorBody["fields"],
) {
  return NextResponse.json<ApiResponse<never>>(
    { success: false, error: { code, message, fields } },
    { status },
  );
}

/**
 * An expected failure thrown by a service (not found, a rule broken). The
 * message is shown to the user as-is. Throwing also rolls back a surrounding
 * transaction.
 */
export class ServiceError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly status: number,
    readonly fields?: ApiErrorBody["fields"],
  ) {
    super(message);
  }
}

/** For a route's `catch`: a ServiceError becomes its response, anything else a logged 500. */
export function apiErrorFrom(error: unknown, context: string) {
  if (error instanceof ServiceError) {
    return apiError(error.code, error.message, error.status, error.fields);
  }
  console.error(`${context} failed`, error);
  return apiError("INTERNAL", "Something went wrong. Please try again.", 500);
}
