import { z } from "zod";

/**
 * Shared field schemas. A field that means the same thing in two modules
 * (an id, a slug, a price, a timestamp, a paged list) is declared once here
 * and composed into module schemas — never redeclared.
 */

export const idSchema = z.string().min(1);

export const slugSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens.");

/** Dates cross the server/client boundary as ISO strings, never `Date`. */
export const isoDateTimeSchema = z.iso.datetime({ offset: true });

/** Prices are integers in minor units — see `formatPrice`. */
export const minorUnitsSchema = z.number().int();

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export function paginatedSchema<Item extends z.ZodType>(item: Item) {
  return z.object({
    items: z.array(item),
    page: z.number().int(),
    pageSize: z.number().int(),
    total: z.number().int(),
  });
}
