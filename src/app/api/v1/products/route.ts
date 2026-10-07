import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { limitByIp } from "@/lib/rate-limit";
import { listShopProducts } from "@/services/catalogue.service";
import { shopQuerySchema } from "@/validators/catalogue.validator";

export async function GET(req: NextRequest) {
  const query = shopQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!query.success) {
    return apiError("VALIDATION", "Invalid search.", 422, z.flattenError(query.error).fieldErrors);
  }

  if (query.data.q) {
    const limited = limitByIp(req, "search");
    if (limited) return limited;
  }

  try {
    return apiSuccess(await listShopProducts(query.data));
  } catch (error) {
    return apiErrorFrom(error, "GET /products");
  }
}
