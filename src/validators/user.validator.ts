import { z } from "zod";
import { ROLES } from "@/lib/auth/permissions";
import { EMIRATE_VALUES } from "@/lib/emirates";
import {
  emailValidator,
  newPasswordValidator,
  optionalPhoneValidator,
  paginationQueryValidator,
} from "./common/primitives.validator";

/**
 * The console's two Users screens read the same endpoint and differ only by
 * `group`: Staff lists Admin and Staff accounts, Customers lists the rest.
 */
export const USER_GROUPS = ["staff", "customers"] as const;
export type UserGroup = (typeof USER_GROUPS)[number];

export const userListQuerySchema = paginationQueryValidator.extend({
  search: z.string().trim().max(100).optional(),
  group: z.enum(USER_GROUPS),
});

export const addressSchema = z.object({
  /** Set for an address that already exists; absent for a new one. */
  id: z.string().min(1).optional(),
  emirate: z.enum(EMIRATE_VALUES, { error: "Choose an emirate." }),
  street: z.string().trim().min(1, "Enter the street name or number.").max(200),
  landmark: z.string().trim().min(1, "Enter the nearest landmark.").max(200),
  isPrimary: z.boolean(),
});

/**
 * Create and update take the same body. `addresses` is the full list:
 * addresses missing from it are removed.
 */
export const userSchema = z
  .object({
    fullName: z.string().trim().min(1, "Enter the full name.").max(120),
    email: emailValidator,
    phone: optionalPhoneValidator,
    role: z.enum(ROLES, { error: "Choose a role." }),
    /** The custom role a Staff account works under; null for Admin and Customer. */
    staffRoleId: z.string().min(1).nullable().default(null),
    /** Optional. Without a password the account can't sign in. */
    password: newPasswordValidator.optional(),
    addresses: z
      .array(addressSchema)
      .max(10, "Save up to 10 addresses.")
      .refine(
        (list) => list.filter((address) => address.isPrimary).length <= 1,
        "Only one address can be primary.",
      ),
  })
  .superRefine((data, ctx) => {
    if (data.role === "STAFF" && data.staffRoleId === null) {
      ctx.addIssue({ code: "custom", path: ["staffRoleId"], message: "Choose a staff role." });
    }
  });
