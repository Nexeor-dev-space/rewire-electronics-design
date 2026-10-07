import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { listFulfilment } from "@/services/order.service";
import { fulfilmentQuerySchema } from "@/validators/order.validator";

export async function GET(req: NextRequest) {
  const auth = await authorizeApi(PERMISSIONS.fulfilment);
  if (!auth.ok) return auth.response;

  const query = fulfilmentQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!query.success) {
    return apiError("VALIDATION", "Invalid filter.", 422, z.flattenError(query.error).fieldErrors);
  }

  try {
    return apiSuccess(await listFulfilment(query.data));
  } catch (error) {
    return apiErrorFrom(error, "GET /admin/fulfilment");
  }
}
