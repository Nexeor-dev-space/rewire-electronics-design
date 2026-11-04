import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import type { ImportRow } from "@/lib/product-import";
import { assertImportAccess, validateImport } from "@/services/product-import.service";
import { productImportValidateSchema } from "@/validators/product-import.validator";

/** Checks an import's rows and returns the preview. Nothing is saved. */
export async function POST(req: NextRequest) {
  const auth = await authorizeApi(PERMISSIONS.bulkUpload, "CREATE");
  if (!auth.ok) return auth.response;

  const input = productImportValidateSchema.safeParse(await req.json().catch(() => null));
  if (!input.success) {
    return apiError("VALIDATION", "That file couldn't be read.", 422, z.flattenError(input.error).fieldErrors);
  }

  try {
    assertImportAccess(auth.session.user.permissions, input.data.mode, input.data.rows as ImportRow[]);
    return apiSuccess(await validateImport(input.data));
  } catch (error) {
    return apiErrorFrom(error, "POST /admin/product-imports/validate");
  }
}
