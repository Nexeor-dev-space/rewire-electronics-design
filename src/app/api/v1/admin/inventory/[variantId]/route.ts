import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { refreshStorefrontCatalogue } from "@/services/catalogue.service";
import { setStock } from "@/services/inventory.service";
import { stockUpdateSchema } from "@/validators/inventory.validator";

type Params = { params: Promise<{ variantId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await authorizeApi(PERMISSIONS.inventory);
  if (!auth.ok) return auth.response;

  const input = stockUpdateSchema.safeParse(await req.json().catch(() => null));
  if (!input.success) {
    return apiError(
      "VALIDATION",
      "Please check the stock count.",
      422,
      z.flattenError(input.error).fieldErrors,
    );
  }

  const { variantId } = await params;
  try {
    const result = await setStock(variantId, input.data);
    refreshStorefrontCatalogue();
    return apiSuccess(result);
  } catch (error) {
    return apiErrorFrom(error, "PATCH /admin/inventory/[variantId]");
  }
}
