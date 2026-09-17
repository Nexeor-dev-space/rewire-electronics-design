/**
 * Result — the return shape of every service call and Server Action that
 * can fail. Expected failures are returned, not thrown, so the UI always
 * handles them and the message survives the server → client boundary.
 */

export type ErrorCode =
  | "VALIDATION"
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "CONFLICT"
  | "NETWORK"
  | "UNKNOWN";

export interface AppError {
  code: ErrorCode;
  /** Safe to show to the user as-is. */
  message: string;
}

export type Result<T> = { ok: true; data: T } | { ok: false; error: AppError };

export const ok = <T>(data: T): Result<T> => ({ ok: true, data });

export const fail = (code: ErrorCode, message: string): Result<never> => ({
  ok: false,
  error: { code, message },
});
