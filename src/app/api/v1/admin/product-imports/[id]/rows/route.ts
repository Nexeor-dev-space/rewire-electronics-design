import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { listImportRows } from "@/services/product-import-run.service";
import { productImportRowsQuerySchema } from "@/validators/product-import.validator";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorizeApi(PERMISSIONS.bulkUpload);
  if (!auth.ok) return auth.response;

  const query = productImportRowsQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!query.success) {
    return apiError("VALIDATION", "Invalid search.", 422, z.flattenError(query.error).fieldErrors);
  }

  try {
    return apiSuccess(await listImportRows((await params).id, query.data));
  } catch (error) {
    return apiErrorFrom(error, "GET /admin/product-imports/[id]/rows");
  }
}
