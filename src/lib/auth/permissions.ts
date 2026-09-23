import { adminPermission } from "@/lib/admin-nav";

/**
 * Roles and what each may do. Client-safe, so the UI can hide what the
 * server would refuse — the server check is the one that counts.
 */

export const ROLES = ["ADMIN", "STAFF", "CUSTOMER"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Admin",
  STAFF: "Staff",
  CUSTOMER: "Customer",
};

/**
 * Admin modules each role may use: `adminPermission(area, key)` keys, or
 * "*" for all of them. An empty list means no admin access. When a staff
 * permission system is specified, narrow STAFF here.
 */
export const ROLE_PERMISSIONS: Record<Role, readonly string[]> = {
  ADMIN: ["*"],
  STAFF: ["*"],
  CUSTOMER: [],
};

export const PERMISSIONS = {
  content: adminPermission("storefront", "content"),
  /** Covers both Users screens — staff accounts and customer accounts. */
  users: adminPermission("service", "users"),
  categories: adminPermission("catalogue", "categories"),
  brands: adminPermission("catalogue", "brands"),
} as const;

export function canAccessAdmin(role: Role): boolean {
  return ROLE_PERMISSIONS[role].length > 0;
}

export function hasPermission(role: Role, permission: string): boolean {
  const granted = ROLE_PERMISSIONS[role];
  return granted.includes("*") || granted.includes(permission);
}

/* ---------- managing accounts ---------- */

export interface Actor {
  id: string;
  role: Role;
}

/** Only Admins edit or delete Admin accounts. */
export function canManageUser(viewer: Actor, target: { role: Role }): boolean {
  return viewer.role === "ADMIN" || target.role !== "ADMIN";
}

/** Only Admins give out the Admin role. */
export function assignableRoles(viewer: Role): Role[] {
  return viewer === "ADMIN" ? [...ROLES] : ["STAFF", "CUSTOMER"];
}

/** A password decides who can sign in as an account, so only Admins set one. */
export function canSetPassword(viewer: Role): boolean {
  return viewer === "ADMIN";
}
