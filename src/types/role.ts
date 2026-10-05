import type { PermissionGrid } from "@/lib/auth/permissions";

/** `GET` and `PUT /api/v1/admin/roles/staff`, request and response alike. */
export interface StaffPermissions {
  permissions: PermissionGrid;
}
