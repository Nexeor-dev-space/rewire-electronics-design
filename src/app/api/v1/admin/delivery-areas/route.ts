import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { recordAudit } from "@/services/audit.service";
import { createDeliveryArea, listDeliveryAreas } from "@/services/delivery-area.service";
import { deliveryAreaListQuerySchema, deliveryAreaSchema } from "@/validators/delivery-zone.validator";

export async function GET(req: NextRequest) {
  const auth = await authorizeApi(PERMISSIONS.deliveryZones);
  if (!auth.ok) return auth.response;

  const query = deliveryAreaListQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!query.success) {
    return apiError("VALIDATION", "Invalid search.", 422, z.flattenError(query.error).fieldErrors);
  }

  try {
    return apiSuccess(await listDeliveryAreas(query.data));
  } catch (error) {
    return apiErrorFrom(error, "GET /admin/delivery-areas");
  }
}

/** Adding an area is an edit of the delivery setup: Delivery Zones has view and edit only. */
export async function POST(req: NextRequest) {
  const auth = await authorizeApi(PERMISSIONS.deliveryZones, "EDIT");
  if (!auth.ok) return auth.response;

  const input = deliveryAreaSchema.safeParse(await req.json().catch(() => null));
  if (!input.success) {
    return apiError(
      "VALIDATION",
      "Please check the highlighted fields.",
      422,
      z.flattenError(input.error).fieldErrors,
    );
  }

  try {
    const result = await createDeliveryArea(input.data);
    await recordAudit(auth.session.user, {
      action: "CREATE",
      module: PERMISSIONS.deliveryZones,
      recordId: result.id,
      recordLabel: `${result.area}, ${result.emirateLabel}`,
      after: result,
    });
    return apiSuccess(result, 201);
  } catch (error) {
    return apiErrorFrom(error, "POST /admin/delivery-areas");
  }
}
