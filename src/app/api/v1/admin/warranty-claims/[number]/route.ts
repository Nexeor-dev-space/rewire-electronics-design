import type { NextRequest } from "next/server";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { getAdminClaim } from "@/services/warranty.service";
import { claimNumberParamsSchema } from "@/validators/warranty.validator";

type Params = { params: Promise<{ number: string }> };

const MESSAGE_NOT_FOUND = "We couldn't find that claim.";

export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await authorizeApi(PERMISSIONS.warranty);
  if (!auth.ok) return auth.response;

  const parsed = claimNumberParamsSchema.safeParse(await params);
  if (!parsed.success) return apiError("NOT_FOUND", MESSAGE_NOT_FOUND, 404);

  try {
    return apiSuccess(await getAdminClaim(parsed.data.number));
  } catch (error) {
    return apiErrorFrom(error, "GET /admin/warranty-claims/[number]");
  }
}
