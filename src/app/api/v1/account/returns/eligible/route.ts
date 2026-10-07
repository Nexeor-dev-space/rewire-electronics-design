import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { authorizeApi } from "@/lib/auth/session";
import { listEligibleOrders } from "@/services/return.service";
import { returnEligibleQuerySchema } from "@/validators/return.validator";

export async function GET(req: NextRequest) {
  const auth = await authorizeApi();
  if (!auth.ok) return auth.response;

  const query = returnEligibleQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!query.success) {
    return apiError("VALIDATION", "Invalid page.", 422, z.flattenError(query.error).fieldErrors);
  }

  try {
    return apiSuccess(await listEligibleOrders(auth.session.user, query.data.page));
  } catch (error) {
    return apiErrorFrom(error, "GET /account/returns/eligible");
  }
}
