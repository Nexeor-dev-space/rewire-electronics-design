import type { AuditAction, AuditValues } from "@/lib/audit";
import type { Role } from "@/lib/auth/permissions";

/** One row of `GET /api/v1/admin/audit-logs`. */
export interface AuditLogEntry {
  id: string;
  actorName: string;
  actorRole: Role;
  action: AuditAction;
  module: string;
  recordId: string | null;
  recordLabel: string;
  before: AuditValues | null;
  after: AuditValues | null;
  createdAt: string;
}

/** A `type`, not `z.input` of the query schema — `z.coerce` inputs are `unknown`. */
export type AuditFilters = {
  page?: number;
  pageSize?: number;
  module?: string;
  action?: AuditAction;
  search?: string;
};
