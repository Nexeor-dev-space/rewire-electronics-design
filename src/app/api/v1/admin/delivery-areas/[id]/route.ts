import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { recordAudit } from "@/services/audit.service";
import { getDeliveryArea, updateDeliveryArea } from "@/services/delivery-area.service";
import { deliveryAreaSchema } from "@/validators/delivery-zone.validator";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await authorizeApi(PERMISSIONS.deliveryZones);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  try {
    return apiSuccess(await getDeliveryArea(id));
  } catch (error) {
    return apiErrorFrom(error, "GET /admin/delivery-areas/[id]");
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
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

  const { id } = await params;
  try {
    const before = await getDeliveryArea(id);
    const result = await updateDeliveryArea(id, input.data);
    await recordAudit(auth.session.user, {
      action: "UPDATE",
      module: PERMISSIONS.deliveryZones,
      recordId: id,
      recordLabel: `${result.area}, ${result.emirateLabel}`,
      before,
      after: result,
    });
    return apiSuccess(result);
  } catch (error) {
    return apiErrorFrom(error, "PUT /admin/delivery-areas/[id]");
  }
}
