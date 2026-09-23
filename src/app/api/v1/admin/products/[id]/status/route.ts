import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { setProductStatus } from "@/services/product.service";
import { productStatusSchema } from "@/validators/product.validator";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await authorizeApi(PERMISSIONS.products);
  if (!auth.ok) return auth.response;

  const input = productStatusSchema.safeParse(await req.json().catch(() => null));
  if (!input.success) {
    return apiError("VALIDATION", "Choose a status.", 422, z.flattenError(input.error).fieldErrors);
  }

  const { id } = await params;
  try {
    return apiSuccess(await setProductStatus(id, input.data));
  } catch (error) {
    return apiErrorFrom(error, "PATCH /admin/products/[id]/status");
  }
}
