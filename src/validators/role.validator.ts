import { z } from "zod";
import { PERMISSION_ACTIONS, STAFF_MODULES } from "@/lib/auth/permissions";

const actionsSchema = z
  .array(z.enum(PERMISSION_ACTIONS, { error: "Unknown permission." }))
  .max(PERMISSION_ACTIONS.length)
  .default([]);

/**
 * The whole Staff grid: one key per Staff module, each a list of actions.
 * Unknown modules are refused; a module left out grants nothing.
 */
export const staffPermissionsSchema = z.object({
  permissions: z
    .strictObject(Object.fromEntries(STAFF_MODULES.map((module) => [module.key, actionsSchema])))
    .default({}),
});
