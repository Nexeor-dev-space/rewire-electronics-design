import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { listAdminReturns } from "@/services/return.service";
import { adminReturnListQuerySchema } from "@/validators/return.validator";

export async function GET(req: NextRequest) {
  const auth = await authorizeApi(PERMISSIONS.returns);
  if (!auth.ok) return auth.response;

  const query = adminReturnListQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!query.success) {
    return apiError("VALIDATION", "Invalid search.", 422, z.flattenError(query.error).fieldErrors);
  }

  try {
    return apiSuccess(await listAdminReturns(query.data));
  } catch (error) {
    return apiErrorFrom(error, "GET /admin/returns");
  }
}
