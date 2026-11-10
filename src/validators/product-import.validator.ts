import { z } from "zod";
import { PRODUCT_IMPORT_MAX_CELL_LENGTH, PRODUCT_IMPORT_MAX_ROWS } from "@/lib/constants";
import {
  IMPORT_COLUMN_KEYS,
  IMPORT_EXTRA_KEYS,
  IMPORT_MODES,
  IMPORT_ROW_STATUSES,
  IMPORT_STATUSES,
} from "@/lib/product-import";
import { paginationQueryValidator } from "./common/primitives.validator";

const cellValidator = z.string().trim().max(PRODUCT_IMPORT_MAX_CELL_LENGTH);

const extraCellValidator = cellValidator.default("");

const templateErrorsValidator = z
  .array(cellValidator)
  .max(IMPORT_COLUMN_KEYS.length + IMPORT_EXTRA_KEYS.length)
  .default([]);

const importRowSchema = z.object({
  rowNumber: z.number().int().min(1),
  parentRowNumber: z.number().int().min(1).nullable().default(null),
  templateErrors: templateErrorsValidator,
  ...Object.fromEntries(IMPORT_COLUMN_KEYS.map((key) => [key, cellValidator])),
  ...Object.fromEntries(IMPORT_EXTRA_KEYS.map((key) => [key, extraCellValidator])),
} as {
  rowNumber: z.ZodNumber;
  parentRowNumber: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
  templateErrors: typeof templateErrorsValidator;
} & Record<(typeof IMPORT_COLUMN_KEYS)[number], typeof cellValidator> &
  Record<(typeof IMPORT_EXTRA_KEYS)[number], typeof extraCellValidator>);

/** The file is read in the browser; the server checks the rows again and never trusts the count. */
export const productImportValidateSchema = z.object({
  mode: z.enum(IMPORT_MODES, { error: "Choose Create New or Update Existing." }),
  columns: z.array(z.string().max(40)).max(IMPORT_COLUMN_KEYS.length),
  rows: z
    .array(importRowSchema)
    .min(1, "The file has no product rows.")
    .max(PRODUCT_IMPORT_MAX_ROWS, `Upload up to ${PRODUCT_IMPORT_MAX_ROWS} rows at a time.`),
});

/** Saving an import: the same rows the preview checked, plus the file's name. */
export const productImportCreateSchema = productImportValidateSchema.extend({
  fileName: z.string().trim().min(1).max(200),
});

export const productImportListQuerySchema = paginationQueryValidator.extend({
  status: z.enum(IMPORT_STATUSES).optional(),
});

export const productImportRowsQuerySchema = paginationQueryValidator.extend({
  status: z.enum(IMPORT_ROW_STATUSES).optional(),
});
