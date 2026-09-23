import { z } from "zod";

/**
 * Shared field validators (Zod). A field that means the same thing in two
 * modules (an id, a slug, a price, a timestamp, a paged list) is declared
 * once here and composed into module validators — never redeclared.
 *
 * "Schema" in this repo means the Prisma schema (`prisma/schema/`).
 */

export const idValidator = z.string().min(1);

export const slugValidator = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens.");

/** Dates cross the server/client boundary as ISO strings, never `Date`. */
export const isoDateTimeValidator = z.iso.datetime({ offset: true });

/** Prices are integers in minor units — see `formatPrice`. */
export const minorUnitsValidator = z.number().int();

export const paginationQueryValidator = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export function paginatedValidator<Item extends z.ZodType>(item: Item) {
  return z.object({
    items: z.array(item),
    page: z.number().int(),
    pageSize: z.number().int(),
    total: z.number().int(),
  });
}

/** Trimmed and lowercased before it is checked, so uniqueness ignores case. */
export const emailValidator = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Enter an email address.")
  .max(254, "That email address is too long.")
  .pipe(z.email("Enter a valid email address."));
