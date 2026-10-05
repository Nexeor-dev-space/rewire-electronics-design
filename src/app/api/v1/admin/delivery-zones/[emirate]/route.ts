import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { recordAudit } from "@/services/audit.service";
import { listDeliveryZones, upsertDeliveryZone } from "@/services/delivery-zone.service";
import { deliveryZoneParamsSchema, deliveryZoneSchema } from "@/validators/delivery-zone.validator";

type Params = { params: Promise<{ emirate: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const auth = await authorizeApi(PERMISSIONS.deliveryZones, "EDIT");
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
    const { emirate } = target.data;
    const before = (await listDeliveryZones()).find((zone) => zone.emirate === emirate);
    const result = await upsertDeliveryZone(emirate, input.data);
    await recordAudit(auth.session.user, {
      action: "UPDATE",
      module: PERMISSIONS.deliveryZones,
      recordId: emirate,
      recordLabel: result.label,
      before,
      after: result,
    });
    return apiSuccess(result);
  } catch (error) {
    return apiErrorFrom(error, "PUT /admin/delivery-zones/[emirate]");
  }
}
