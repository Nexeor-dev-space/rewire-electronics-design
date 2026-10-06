import { z } from "zod";
import { STAFF_MODULES, availableLevels, type AccessLevel } from "@/lib/auth/permissions";
import { STAFF_ROLE_DESCRIPTION_MAX_LENGTH, STAFF_ROLE_NAME_MAX_LENGTH } from "@/lib/constants";
import { paginationQueryValidator } from "./common/primitives.validator";

export const staffRoleListQuerySchema = paginationQueryValidator.extend({
  search: z.string().trim().max(100).optional(),
});

/** One key per Staff module, each limited to the levels that module offers. */
const permissionsSchema = z
  .strictObject(
    Object.fromEntries(
      STAFF_MODULES.map((module) => [
        module.key,
        z
          .enum(availableLevels(module) as [AccessLevel, ...AccessLevel[]], {
            error: `That access level isn't available for ${module.label}.`,
          })
          .default("NONE"),
      ]),
    ),
  )
  .default({});

/** Create and update take the same body. A module left out is No access. */
export const staffRoleSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter a role name.")
    .max(STAFF_ROLE_NAME_MAX_LENGTH, `Use ${STAFF_ROLE_NAME_MAX_LENGTH} characters or fewer.`),
  description: z
    .string()
    .trim()
    .max(STAFF_ROLE_DESCRIPTION_MAX_LENGTH, `Use ${STAFF_ROLE_DESCRIPTION_MAX_LENGTH} characters or fewer.`)
    .nullable()
    .default(null)
    .transform((value) => value || null),
  permissions: permissionsSchema,
});
