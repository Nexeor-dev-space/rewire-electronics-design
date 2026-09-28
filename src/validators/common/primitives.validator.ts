import { z } from "zod";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/lib/constants";

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

export const newPasswordValidator = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters.`)
  .max(PASSWORD_MAX_LENGTH, "That password is too long.");

export const phoneValidator = z
  .string()
  .trim()
  .min(1, "Enter a phone number.")
  .regex(/^\+?[\d\s()-]{7,20}$/, "Enter a valid phone number.");

export const optionalPhoneValidator = z
  .string()
  .trim()
  .nullish()
  .transform((value) => value || null)
  .pipe(phoneValidator.nullable());

export const authTokenValidator = z
  .string()
  .trim()
  .min(1, "This link is incomplete. Open it again from your email.")
  .max(128, "This link has expired or was already used.");
