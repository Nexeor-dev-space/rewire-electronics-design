import { z } from "zod";
import { paginationQueryValidator } from "./common/primitives.validator";

export const brandListQuerySchema = paginationQueryValidator.extend({
  search: z.string().trim().max(100).optional(),
});

/** Create and update take the same body. */
export const brandSchema = z.object({
  name: z.string().trim().min(1, "Enter a brand name.").max(80, "Use 80 characters or fewer."),
  imageId: z.string().min(1).nullable().default(null),
});
