import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { deleteCategory, getCategory, updateCategory } from "@/services/category.service";
import { categorySchema } from "@/validators/category.validator";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await authorizeApi(PERMISSIONS.categories);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  try {
    return apiSuccess(await getCategory(id));
  } catch (error) {
    return apiErrorFrom(error, "GET /admin/categories/[id]");
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  const auth = await authorizeApi(PERMISSIONS.categories);
  if (!auth.ok) return auth.response;

  const input = categorySchema.safeParse(await req.json().catch(() => null));
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
    return apiSuccess(await updateCategory(id, input.data));
  } catch (error) {
    return apiErrorFrom(error, "PUT /admin/categories/[id]");
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const auth = await authorizeApi(PERMISSIONS.categories);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  try {
    return apiSuccess(await deleteCategory(id));
  } catch (error) {
    return apiErrorFrom(error, "DELETE /admin/categories/[id]");
  }
}
