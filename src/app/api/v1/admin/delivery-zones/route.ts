import { apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { listDeliveryZones } from "@/services/delivery-zone.service";

export async function GET() {
  const auth = await authorizeApi(PERMISSIONS.deliveryZones);
  if (!auth.ok) return auth.response;

  try {
    return apiSuccess(await listDeliveryZones());
  } catch (error) {
    return apiErrorFrom(error, "GET /admin/delivery-zones");
  }
}
