import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { recordAudit } from "@/services/audit.service";
import { deleteBrand, getBrand, updateBrand } from "@/services/brand.service";
import { refreshStorefrontCatalogue } from "@/services/catalogue.service";
import { brandSchema } from "@/validators/brand.validator";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await authorizeApi(PERMISSIONS.brands);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  try {
    return apiSuccess(await getBrand(id));
  } catch (error) {
    return apiErrorFrom(error, "GET /admin/brands/[id]");
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  const auth = await authorizeApi(PERMISSIONS.brands, "EDIT");
  if (!auth.ok) return auth.response;

  const input = brandSchema.safeParse(await req.json().catch(() => null));
  if (!input.success) {
    return apiError(
      "VALIDATION",
      "Please check the highlighted fields.",
      422,
      z.flattenError(input.error).fieldErrors,
    );
  }

  const { id } = await params;
  try {
    const before = await getBrand(id);
    const result = await updateBrand(id, input.data);
    await recordAudit(auth.session.user, {
      action: "UPDATE",
      module: PERMISSIONS.brands,
      recordId: id,
      recordLabel: result.name,
      before,
      after: result,
    });
    refreshStorefrontCatalogue();
    return apiSuccess(result);
  } catch (error) {
    return apiErrorFrom(error, "PUT /admin/brands/[id]");
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const auth = await authorizeApi(PERMISSIONS.brands, "DELETE");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  try {
    const before = await getBrand(id);
    const result = await deleteBrand(id);
    await recordAudit(auth.session.user, {
      action: "DELETE",
      module: PERMISSIONS.brands,
      recordId: id,
      recordLabel: before.name,
      before,
    });
    refreshStorefrontCatalogue();
    return apiSuccess(result);
  } catch (error) {
    return apiErrorFrom(error, "DELETE /admin/brands/[id]");
  }
}
