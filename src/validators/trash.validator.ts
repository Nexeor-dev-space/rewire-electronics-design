import { z } from "zod";
import { paginationQueryValidator } from "./common/primitives.validator";

export const trashListQuerySchema = paginationQueryValidator.extend({
  search: z.string().trim().max(100).optional(),
});
