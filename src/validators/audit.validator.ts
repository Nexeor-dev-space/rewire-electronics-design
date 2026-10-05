import { z } from "zod";
import { AUDIT_ACTIONS } from "@/lib/audit";
import { ADMIN_MODULES } from "@/lib/auth/permissions";
import { paginationQueryValidator } from "./common/primitives.validator";

const MODULE_KEYS = ADMIN_MODULES.map((module) => module.key) as [string, ...string[]];

export const auditListQuerySchema = paginationQueryValidator.extend({
  module: z.enum(MODULE_KEYS).optional(),
  action: z.enum(AUDIT_ACTIONS).optional(),
  /** Matches the record name or the person who made the change. */
  search: z.string().trim().max(100).optional(),
});
