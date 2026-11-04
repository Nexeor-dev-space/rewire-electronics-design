import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import type { ImportRow } from "@/lib/product-import";
import { createImport, listImports } from "@/services/product-import-run.service";
import { assertImportAccess } from "@/services/product-import.service";
import { productImportCreateSchema, productImportListQuerySchema } from "@/validators/product-import.validator";

export async function GET(req: NextRequest) {
  const auth = await authorizeApi(PERMISSIONS.bulkUpload);
  if (!auth.ok) return auth.response;

  const query = productImportListQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!query.success) {
    return apiError("VALIDATION", "Invalid search.", 422, z.flattenError(query.error).fieldErrors);
  }

  try {
    return apiSuccess(await listImports(query.data));
  } catch (error) {
    return apiErrorFrom(error, "GET /admin/product-imports");
  }
}

/** Stores a checked file as a Pending import. Rows are saved by `[id]/process`. */
export async function POST(req: NextRequest) {
  const auth = await authorizeApi(PERMISSIONS.bulkUpload, "CREATE");
  if (!auth.ok) return auth.response;

  const input = productImportCreateSchema.safeParse(await req.json().catch(() => null));
  if (!input.success) {
    return apiError("VALIDATION", "That file couldn't be read.", 422, z.flattenError(input.error).fieldErrors);
  }

  try {
    assertImportAccess(auth.session.user.permissions, input.data.mode, input.data.rows as ImportRow[]);
    return apiSuccess(await createImport(auth.session.user, input.data), 201);
  } catch (error) {
    return apiErrorFrom(error, "POST /admin/product-imports");
  }
}
