import type { NextRequest } from "next/server";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { getAdminReturn } from "@/services/return.service";
import { returnNumberParamsSchema } from "@/validators/return.validator";

type Params = { params: Promise<{ number: string }> };

const MESSAGE_NOT_FOUND = "We couldn't find that return.";

export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await authorizeApi(PERMISSIONS.returns);
  if (!auth.ok) return auth.response;

  const parsed = returnNumberParamsSchema.safeParse(await params);
  if (!parsed.success) return apiError("NOT_FOUND", MESSAGE_NOT_FOUND, 404);

  try {
    return apiSuccess(await getAdminReturn(parsed.data.number));
  } catch (error) {
    return apiErrorFrom(error, "GET /admin/returns/[number]");
  }
}
