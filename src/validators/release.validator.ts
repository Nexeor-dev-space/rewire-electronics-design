import { z } from "zod";
import {
  RELEASE_ALLOCATIONS_MAX,
  RELEASE_DESCRIPTION_MAX_LENGTH,
  RELEASE_EDITION_MAX_LENGTH,
  RELEASE_MAX_PER_CUSTOMER_LIMIT,
  RELEASE_TITLE_MAX_LENGTH,
  SEARCH_QUERY_MAX_LENGTH,
} from "@/lib/constants";
import { RELEASE_SORTS, RELEASE_STATE_ACTIONS, RELEASE_STATUSES } from "@/lib/releases";
import { idValidator, isoDateTimeValidator, paginationQueryValidator } from "./common/primitives.validator";
import { MAX_STOCK } from "./product.validator";

export const RELEASE_END_BEFORE_START = "End after the opening time.";

export function endsBeforeStart(startsAt: string, endsAt: string): boolean {
  return Date.parse(endsAt) <= Date.parse(startsAt);
}

export const releaseListQuerySchema = paginationQueryValidator.extend({
  search: z.string().trim().max(SEARCH_QUERY_MAX_LENGTH).optional(),
  status: z.enum(RELEASE_STATUSES).optional(),
  sort: z.enum(RELEASE_SORTS).default("opens_desc"),
});

export const releaseSchema = z
  .object({
    title: z
      .string("Enter a title.")
      .trim()
      .min(1, "Enter a title.")
      .max(RELEASE_TITLE_MAX_LENGTH, `Use ${RELEASE_TITLE_MAX_LENGTH} characters or fewer.`),
    edition: z
      .string()
      .trim()
      .max(RELEASE_EDITION_MAX_LENGTH, `Use ${RELEASE_EDITION_MAX_LENGTH} characters or fewer.`)
      .default(""),
    description: z
      .string()
      .trim()
      .max(RELEASE_DESCRIPTION_MAX_LENGTH, `Use ${RELEASE_DESCRIPTION_MAX_LENGTH} characters or fewer.`)
      .default(""),
    startsAt: isoDateTimeValidator,
    endsAt: isoDateTimeValidator.nullable().default(null),
    maxPerCustomer: z
      .number("Enter a number.")
      .int("Use a whole number.")
      .min(1, "Allow at least 1.")
      .max(RELEASE_MAX_PER_CUSTOMER_LIMIT, `Use ${RELEASE_MAX_PER_CUSTOMER_LIMIT} or fewer.`),
    hidden: z.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    if (data.endsAt && endsBeforeStart(data.startsAt, data.endsAt)) {
      ctx.addIssue({ code: "custom", path: ["endsAt"], message: RELEASE_END_BEFORE_START });
    }
  });

export const releaseStateSchema = z.object({
  action: z.enum(RELEASE_STATE_ACTIONS, { error: "Choose an action." }),
});

export const releaseAllocationsSchema = z.object({
  allocations: z
    .array(
      z.object({
        variantId: idValidator,
        allocated: z
          .number("Enter a number of units.")
          .int("Use a whole number.")
          .min(0, "Units can't be negative.")
          .max(MAX_STOCK, `Use ${MAX_STOCK} or fewer.`),
      }),
    )
    .max(RELEASE_ALLOCATIONS_MAX, `Add ${RELEASE_ALLOCATIONS_MAX} variants or fewer.`)
    .refine(
      (rows) => new Set(rows.map((row) => row.variantId)).size === rows.length,
      "Each variant can appear once.",
    ),
});
