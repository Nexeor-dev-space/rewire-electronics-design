import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { recordAudit } from "@/services/audit.service";
import { refreshStorefrontCatalogue } from "@/services/catalogue.service";
import { getCategory, setCategoryStatus } from "@/services/category.service";
import { categoryStatusSchema } from "@/validators/category.validator";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await authorizeApi(PERMISSIONS.categories, "PUBLISH");
  if (!auth.ok) return auth.response;

  const input = categoryStatusSchema.safeParse(await req.json().catch(() => null));
  if (!input.success) {
    return apiError("VALIDATION", "Choose a status.", 422, z.flattenError(input.error).fieldErrors);
  }

  const { id } = await params;
  try {
    const before = await getCategory(id);
    const result = await setCategoryStatus(id, input.data);
    await recordAudit(auth.session.user, {
      action: "UPDATE",
      module: PERMISSIONS.categories,
      recordId: id,
      recordLabel: result.name,
      before: { status: before.status },
      after: { status: result.status },
    });
    refreshStorefrontCatalogue();
    return apiSuccess(result);
  } catch (error) {
    return apiErrorFrom(error, "PATCH /admin/categories/[id]/status");
  }
}
