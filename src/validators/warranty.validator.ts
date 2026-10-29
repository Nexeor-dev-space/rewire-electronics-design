import { z } from "zod";
import {
  ORDER_NOTE_MAX_LENGTH,
  REFERENCE_NUMBER_DIGITS,
  SEARCH_QUERY_MAX_LENGTH,
  WARRANTY_CLAIM_ISSUE_MAX_LENGTH,
  WARRANTY_CLAIM_ISSUE_MIN_LENGTH,
  WARRANTY_CLAIM_NUMBER_PREFIX,
} from "@/lib/constants";
import { WARRANTY_CLAIM_STATUSES, WARRANTY_STATUSES } from "@/lib/warranty";
import { idValidator, isoDateTimeValidator, paginationQueryValidator } from "./common/primitives.validator";
import { serialNumberValidator } from "./order.validator";

const CLAIM_NUMBER_PATTERN = new RegExp(`^${WARRANTY_CLAIM_NUMBER_PREFIX}\\d{${REFERENCE_NUMBER_DIGITS}}$`);
/** A claim is raised by its own route, so a status change never targets Raised. */
const CLAIM_STATUS_TARGETS = WARRANTY_CLAIM_STATUSES.filter(
  (status): status is Exclude<(typeof WARRANTY_CLAIM_STATUSES)[number], "RAISED"> => status !== "RAISED",
);

export const warrantyIdParamsSchema = z.object({ id: idValidator });

export const claimNumberValidator = z
  .string()
  .trim()
  .toUpperCase()
  .regex(CLAIM_NUMBER_PATTERN, "Enter a valid claim number.");

export const claimNumberParamsSchema = z.object({ number: claimNumberValidator });

export const adminWarrantyListQuerySchema = paginationQueryValidator.extend({
  search: z.string().trim().max(SEARCH_QUERY_MAX_LENGTH).optional(),
  status: z.enum(WARRANTY_STATUSES).optional(),
});

/** What staff may correct on a warranty. The end date and status always follow the start. */
export const updateWarrantySchema = z
  .object({
    serialNumber: serialNumberValidator.optional(),
    warrantyStartsAt: isoDateTimeValidator.optional(),
  })
  .refine((data) => data.serialNumber !== undefined || data.warrantyStartsAt !== undefined, {
    message: "Nothing to update.",
  });

export const createClaimSchema = z.object({
  serialNumber: serialNumberValidator.min(1, "Choose the device the claim is for."),
  issue: z
    .string()
    .trim()
    .min(WARRANTY_CLAIM_ISSUE_MIN_LENGTH, "Describe the fault.")
    .max(WARRANTY_CLAIM_ISSUE_MAX_LENGTH, `Use ${WARRANTY_CLAIM_ISSUE_MAX_LENGTH} characters or fewer.`),
});

export const claimStatusChangeSchema = z.object({
  status: z.enum(CLAIM_STATUS_TARGETS, { error: "Choose a status." }),
  note: z
    .string()
    .trim()
    .max(ORDER_NOTE_MAX_LENGTH, `Use ${ORDER_NOTE_MAX_LENGTH} characters or fewer.`)
    .default(""),
});
