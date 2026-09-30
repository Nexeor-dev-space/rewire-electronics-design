import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { upsertDeliveryZone } from "@/services/delivery-zone.service";
import { deliveryZoneParamsSchema, deliveryZoneSchema } from "@/validators/delivery-zone.validator";

type Params = { params: Promise<{ emirate: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const auth = await authorizeApi(PERMISSIONS.deliveryZones);
  if (!auth.ok) return auth.response;

  const target = deliveryZoneParamsSchema.safeParse(await params);
  if (!target.success) {
    return apiError("NOT_FOUND", "We couldn't find that emirate.", 404);
  }

  const input = deliveryZoneSchema.safeParse(await req.json().catch(() => null));
  if (!input.success) {
    return apiError(
      "VALIDATION",
      "Please check the highlighted fields.",
      422,
      z.flattenError(input.error).fieldErrors,
    );
  }

  try {
    return apiSuccess(await upsertDeliveryZone(target.data.emirate, input.data));
  } catch (error) {
    return apiErrorFrom(error, "PUT /admin/delivery-zones/[emirate]");
  }
}
