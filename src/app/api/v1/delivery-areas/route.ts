import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { listDeliveryAreaOptions } from "@/services/delivery-area.service";
import { deliveryAreaOptionsQuerySchema } from "@/validators/delivery-zone.validator";

/** Public: the enabled areas of one emirate, for the checkout dropdown. */
export async function GET(req: NextRequest) {
  const query = deliveryAreaOptionsQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!query.success) {
    return apiError("VALIDATION", "Choose an emirate.", 422, z.flattenError(query.error).fieldErrors);
  }

  try {
    return apiSuccess(await listDeliveryAreaOptions(query.data.emirate));
  } catch (error) {
    return apiErrorFrom(error, "GET /delivery-areas");
  }
}
