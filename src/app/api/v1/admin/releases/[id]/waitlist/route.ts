import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { listReleaseWaitlist } from "@/services/waitlist.service";
import { adminWaitlistQuerySchema } from "@/validators/waitlist.validator";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const auth = await authorizeApi(PERMISSIONS.releases);
  if (!auth.ok) return auth.response;

  const query = adminWaitlistQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!query.success) {
    return apiError("VALIDATION", "Invalid page.", 422, z.flattenError(query.error).fieldErrors);
  }

  const { id } = await params;
  try {
    return apiSuccess(await listReleaseWaitlist(id, query.data));
  } catch (error) {
    return apiErrorFrom(error, "GET /admin/releases/[id]/waitlist");
  }
}
