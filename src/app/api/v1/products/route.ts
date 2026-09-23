import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { listShopProducts } from "@/services/catalogue.service";
import { shopQuerySchema } from "@/validators/catalogue.validator";

export async function GET(req: NextRequest) {
  const query = shopQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!query.success) {
    return apiError("VALIDATION", "Invalid search.", 422, z.flattenError(query.error).fieldErrors);
  }

  try {
    return apiSuccess(await listShopProducts(query.data));
  } catch (error) {
    return apiErrorFrom(error, "GET /products");
  }
}
