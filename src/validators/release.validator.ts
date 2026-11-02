import { z } from "zod";
import { RELEASE_TITLE_MAX_LENGTH, SEARCH_QUERY_MAX_LENGTH } from "@/lib/constants";
import { isoDateTimeValidator, paginationQueryValidator } from "./common/primitives.validator";

export const RELEASE_END_BEFORE_START = "End after the start date.";

export function endsBeforeStart(startsAt: string, endsAt: string): boolean {
  return Date.parse(endsAt) <= Date.parse(startsAt);
}

export const releaseListQuerySchema = paginationQueryValidator.extend({
  search: z.string().trim().max(SEARCH_QUERY_MAX_LENGTH).optional(),
});

export const releaseSchema = z
  .object({
    title: z
      .string("Enter a title.")
      .trim()
      .min(1, "Enter a title.")
      .max(RELEASE_TITLE_MAX_LENGTH, `Use ${RELEASE_TITLE_MAX_LENGTH} characters or fewer.`),
    productId: z.string("Choose a product.").min(1, "Choose a product."),
    startsAt: isoDateTimeValidator,
    endsAt: isoDateTimeValidator.nullable().default(null),
    active: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    if (data.endsAt && endsBeforeStart(data.startsAt, data.endsAt)) {
      ctx.addIssue({ code: "custom", path: ["endsAt"], message: RELEASE_END_BEFORE_START });
    }
  });
