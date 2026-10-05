import { ADMIN_MODULES } from "@/lib/auth/permissions";

/**
 * Audit log vocabulary and the diff behind "previous value / new value".
 * Client safe: the Change Log screen reads the labels from here.
 */

export const AUDIT_ACTIONS = ["CREATE", "UPDATE", "DELETE", "RESTORE", "PURGE", "PUBLISH", "DISCARD"] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  CREATE: "Created",
  UPDATE: "Updated",
  DELETE: "Deleted",
  RESTORE: "Restored",
  PURGE: "Deleted permanently",
  PUBLISH: "Published",
  DISCARD: "Discarded draft",
};

const MODULE_LABELS = new Map(ADMIN_MODULES.map((module) => [module.key, module.label]));

export function auditModuleLabel(key: string): string {
  return MODULE_LABELS.get(key) ?? key;
}

export type AuditValues = Record<string, unknown>;

/** `minOrderAmount` → `Min order amount`, for the change detail. */
export function auditFieldLabel(key: string): string {
  const words = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Bookkeeping fields every save touches, and never anything secret. */
const SKIPPED_KEYS = new Set(["updatedAt", "createdAt", "password", "passwordHash"]);

/** A plain JSON copy (Dates become ISO strings) without the skipped keys. */
export function auditSnapshot(value: object | null | undefined): AuditValues | null {
  if (!value) return null;
  const plain = JSON.parse(JSON.stringify(value)) as AuditValues;
  for (const key of SKIPPED_KEYS) delete plain[key];
  return plain;
}

/**
 * The top level fields that differ between two snapshots, as a before and
 * an after holding only those fields. Arrays and objects compare whole, so
 * one changed variant records the variants list both ways.
 */
export function auditDiff(
  before: AuditValues,
  after: AuditValues,
): { before: AuditValues; after: AuditValues } | null {
  const changedBefore: AuditValues = {};
  const changedAfter: AuditValues = {};

  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (JSON.stringify(before[key]) === JSON.stringify(after[key])) continue;
    changedBefore[key] = before[key] ?? null;
    changedAfter[key] = after[key] ?? null;
  }

  return Object.keys(changedAfter).length > 0 ? { before: changedBefore, after: changedAfter } : null;
}
