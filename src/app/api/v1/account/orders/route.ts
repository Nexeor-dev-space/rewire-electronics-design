import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { authorizeApi } from "@/lib/auth/session";
import { listAccountOrders } from "@/services/order.service";
import { accountOrdersQuerySchema } from "@/validators/order.validator";

export async function GET(req: NextRequest) {
  const auth = await authorizeApi();
  if (!auth.ok) return auth.response;

  const query = accountOrdersQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!query.success) {
    return apiError("VALIDATION", "Invalid page.", 422, z.flattenError(query.error).fieldErrors);
  }

  try {
    return apiSuccess(await listAccountOrders(auth.session.user, query.data.page));
  } catch (error) {
    return apiErrorFrom(error, "GET /account/orders");
  }
}
