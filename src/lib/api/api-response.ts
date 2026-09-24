import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";

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

const PRISMA_UNIQUE_VIOLATION = "P2002";
const PRISMA_RECORD_NOT_FOUND = "P2025";
const PRISMA_TOO_MANY_CONNECTIONS = "P2037";

const MESSAGE_NOT_FOUND = "That record no longer exists.";
const MESSAGE_DATABASE_BUSY = "The database is busy. Please try again.";
const MESSAGE_INTERNAL = "Something went wrong. Please try again.";

function uniqueViolationMessage(error: Prisma.PrismaClientKnownRequestError) {
  const target = error.meta?.target;
  const columns = Array.isArray(target) ? target.join(", ") : "This value";
  return `${columns} is already in use.`;
}

function apiErrorFromPrisma(error: Prisma.PrismaClientKnownRequestError) {
  switch (error.code) {
    case PRISMA_UNIQUE_VIOLATION:
      return apiError("CONFLICT", uniqueViolationMessage(error), 409);
    case PRISMA_RECORD_NOT_FOUND:
      return apiError("NOT_FOUND", MESSAGE_NOT_FOUND, 404);
    case PRISMA_TOO_MANY_CONNECTIONS:
      return apiError("INTERNAL", MESSAGE_DATABASE_BUSY, 500);
    default:
      return null;
  }
}

/**
 * For a route's `catch`: a ServiceError becomes its response, a known Prisma
 * failure a readable one, anything else a logged 500.
 */
export function apiErrorFrom(error: unknown, context: string) {
  if (error instanceof ServiceError) {
    return apiError(error.code, error.message, error.status, error.fields);
  }
  console.error(`${context} failed`, error);
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const response = apiErrorFromPrisma(error);
    if (response) return response;
  }
  return apiError("INTERNAL", MESSAGE_INTERNAL, 500);
}
