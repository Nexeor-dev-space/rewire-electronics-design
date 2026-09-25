import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
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
  const auth = await authorizeApi(PERMISSIONS.brands);
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
    const result = await updateBrand(id, input.data);
    refreshStorefrontCatalogue();
    return apiSuccess(result);
  } catch (error) {
    return apiErrorFrom(error, "PUT /admin/brands/[id]");
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const auth = await authorizeApi(PERMISSIONS.brands);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  try {
    const result = await deleteBrand(id);
    refreshStorefrontCatalogue();
    return apiSuccess(result);
  } catch (error) {
    return apiErrorFrom(error, "DELETE /admin/brands/[id]");
  }
}
