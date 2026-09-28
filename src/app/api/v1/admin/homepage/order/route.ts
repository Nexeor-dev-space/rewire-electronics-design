import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { reorderHomepageSections } from "@/services/homepage.service";
import { reorderHomepageSchema } from "@/validators/homepage.validator";

export async function PUT(req: NextRequest) {
  const auth = await authorizeApi(PERMISSIONS.homepage);
  if (!auth.ok) return auth.response;

  const input = reorderHomepageSchema.safeParse(await req.json().catch(() => null));
  if (!input.success) {
    return apiError("VALIDATION", "Invalid order.", 422, z.flattenError(input.error).fieldErrors);
  }

  try {
    return apiSuccess(await reorderHomepageSections(input.data.ids));
  } catch (error) {
    return apiErrorFrom(error, "PUT /admin/homepage/order");
  }
}
