import { z } from "zod";
import { PRODUCT_IMPORT_MAX_CELL_LENGTH, PRODUCT_IMPORT_MAX_ROWS } from "@/lib/constants";
import { IMPORT_COLUMN_KEYS, IMPORT_MODES } from "@/lib/product-import";

const cellValidator = z.string().trim().max(PRODUCT_IMPORT_MAX_CELL_LENGTH);

const importRowSchema = z.object({
  rowNumber: z.number().int().min(1),
  ...Object.fromEntries(IMPORT_COLUMN_KEYS.map((key) => [key, cellValidator])),
} as { rowNumber: z.ZodNumber } & Record<(typeof IMPORT_COLUMN_KEYS)[number], typeof cellValidator>);

/** The file is read in the browser; the server checks the rows again and never trusts the count. */
export const productImportValidateSchema = z.object({
  mode: z.enum(IMPORT_MODES, { error: "Choose Create New or Update Existing." }),
  columns: z.array(z.string().max(40)).max(IMPORT_COLUMN_KEYS.length),
  rows: z
    .array(importRowSchema)
    .min(1, "The file has no product rows.")
    .max(PRODUCT_IMPORT_MAX_ROWS, `Upload up to ${PRODUCT_IMPORT_MAX_ROWS} rows at a time.`),
});
