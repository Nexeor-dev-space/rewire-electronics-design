import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { listAdminWarranties } from "@/services/warranty.service";
import { adminWarrantyListQuerySchema } from "@/validators/warranty.validator";

export async function GET(req: NextRequest) {
  const auth = await authorizeApi(PERMISSIONS.warranty);
  if (!auth.ok) return auth.response;

  const query = adminWarrantyListQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!query.success) {
    return apiError("VALIDATION", "Invalid search.", 422, z.flattenError(query.error).fieldErrors);
  }

  try {
    return apiSuccess(await listAdminWarranties(query.data));
  } catch (error) {
    return apiErrorFrom(error, "GET /admin/warranties");
  }
}
