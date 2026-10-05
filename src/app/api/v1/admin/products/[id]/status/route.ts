import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { recordAudit } from "@/services/audit.service";
import { refreshStorefrontCatalogue } from "@/services/catalogue.service";
import { getProduct, setProductStatus } from "@/services/product.service";
import { productStatusSchema } from "@/validators/product.validator";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await authorizeApi(PERMISSIONS.products, "PUBLISH");
  if (!auth.ok) return auth.response;

  const input = productStatusSchema.safeParse(await req.json().catch(() => null));
  if (!input.success) {
    return apiError("VALIDATION", "Choose a status.", 422, z.flattenError(input.error).fieldErrors);
  }

  const { id } = await params;
  try {
    const before = await getProduct(id);
    const result = await setProductStatus(id, input.data);
    await recordAudit(auth.session.user, {
      action: "UPDATE",
      module: PERMISSIONS.products,
      recordId: id,
      recordLabel: result.name,
      before: { status: before.status },
      after: { status: result.status },
    });
    refreshStorefrontCatalogue();
    return apiSuccess(result);
  } catch (error) {
    return apiErrorFrom(error, "PATCH /admin/products/[id]/status");
  }
}
