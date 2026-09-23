import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { deleteProduct, getProduct, updateProduct } from "@/services/product.service";
import { productSchema } from "@/validators/product.validator";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await authorizeApi(PERMISSIONS.products);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  try {
    return apiSuccess(await getProduct(id));
  } catch (error) {
    return apiErrorFrom(error, "GET /admin/products/[id]");
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  const auth = await authorizeApi(PERMISSIONS.products);
  if (!auth.ok) return auth.response;

  const input = productSchema.safeParse(await req.json().catch(() => null));
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
    return apiSuccess(await updateProduct(id, input.data));
  } catch (error) {
    return apiErrorFrom(error, "PUT /admin/products/[id]");
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const auth = await authorizeApi(PERMISSIONS.products);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  try {
    return apiSuccess(await deleteProduct(id));
  } catch (error) {
    return apiErrorFrom(error, "DELETE /admin/products/[id]");
  }
}
