import type { z } from "zod";
import type { AccessLevel } from "@/lib/auth/permissions";
import type { staffRoleSchema } from "@/validators/role.validator";

/** A row of `GET /api/v1/admin/roles`. */
export interface StaffRoleListItem {
  id: string;
  name: string;
  description: string | null;
  /** Staff accounts holding the role, deleted ones included. */
  staffCount: number;
  /** ISO string. */
  updatedAt: string;
}

/** `GET /api/v1/admin/roles/[id]`: every Staff module with its level, NONE included. */
export interface StaffRoleDetail extends StaffRoleListItem {
  permissions: Record<string, AccessLevel>;
}

export type StaffRoleFilters = { page?: number; pageSize?: number; search?: string };

export type StaffRoleInput = z.input<typeof staffRoleSchema>;
