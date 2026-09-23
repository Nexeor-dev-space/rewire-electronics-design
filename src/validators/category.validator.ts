import { z } from "zod";
import { paginationQueryValidator, slugValidator } from "./common/primitives.validator";

/**
 * Categories are two levels deep. `type` is not stored — it is derived from
 * `parentId` on read — but it is submitted, because the modal asks for it
 * before it can know whether a parent is required.
 */

export const CATEGORY_TYPES = ["parent", "child"] as const;
export type CategoryType = (typeof CATEGORY_TYPES)[number];

export const CATEGORY_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;
export type CategoryStatus = (typeof CATEGORY_STATUSES)[number];

export const MAX_CATEGORY_POSITION = 999;

/**
 * `parentId` narrows to one parent's children and wins over `type`; the
 * combination is meaningless rather than invalid, and rejecting it buys
 * nothing. With neither, the list comes back as parents with their children
 * nested.
 */
export const categoryListQuerySchema = paginationQueryValidator.extend({
  search: z.string().trim().max(100).optional(),
  type: z.enum(CATEGORY_TYPES).optional(),
  parentId: z.string().min(1).optional(),
});

export const categorySchema = z
  .object({
    name: z.string().trim().min(1, "Enter a category name.").max(80, "Use 80 characters or fewer."),
    slug: slugValidator.max(80, "Use 80 characters or fewer."),
    type: z.enum(CATEGORY_TYPES, { error: "Choose a category type." }),
    parentId: z.string().min(1).nullable().default(null),
    imageId: z.string().min(1).nullable().default(null),
    description: z.string().trim().max(300, "Use 300 characters or fewer.").default(""),
    status: z.enum(CATEGORY_STATUSES, { error: "Choose a status." }).default("PUBLISHED"),
    showInNav: z.boolean().default(true),
    sortOrder: z
      .number({ error: "Enter a position." })
      .int("Use a whole number.")
      .min(0, "Use 0 or more.")
      .max(MAX_CATEGORY_POSITION, `Use ${MAX_CATEGORY_POSITION} or less.`)
      .default(0),
  })
  // superRefine, not refine: the two failures need different messages on the
  // same path, and a single refine would print one of them for both.
  .superRefine((data, ctx) => {
    if (data.type === "child" && data.parentId === null) {
      ctx.addIssue({
        code: "custom",
        path: ["parentId"],
        message: "Choose a parent category.",
      });
    }
    if (data.type === "parent" && data.parentId !== null) {
      ctx.addIssue({
        code: "custom",
        path: ["parentId"],
        message: "A parent category can't sit under another category.",
      });
    }
  });

export const categoryStatusSchema = z.object({
  status: z.enum(CATEGORY_STATUSES, { error: "Choose a status." }),
});
