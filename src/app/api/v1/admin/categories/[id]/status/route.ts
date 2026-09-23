import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { refreshStorefrontCatalogue } from "@/services/catalogue.service";
import { setCategoryStatus } from "@/services/category.service";
import { categoryStatusSchema } from "@/validators/category.validator";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await authorizeApi(PERMISSIONS.categories);
  if (!auth.ok) return auth.response;

  const input = categoryStatusSchema.safeParse(await req.json().catch(() => null));
  if (!input.success) {
    return apiError("VALIDATION", "Choose a status.", 422, z.flattenError(input.error).fieldErrors);
  }

  const { id } = await params;
  try {
    const result = await setCategoryStatus(id, input.data);
    refreshStorefrontCatalogue();
    return apiSuccess(result);
  } catch (error) {
    return apiErrorFrom(error, "PATCH /admin/categories/[id]/status");
  }
}
