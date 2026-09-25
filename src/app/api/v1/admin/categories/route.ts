import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { refreshStorefrontCatalogue } from "@/services/catalogue.service";
import { createCategory, listCategories } from "@/services/category.service";
import { categoryListQuerySchema, categorySchema } from "@/validators/category.validator";

export async function GET(req: NextRequest) {
  const auth = await authorizeApi(PERMISSIONS.categories);
  if (!auth.ok) return auth.response;

  const query = categoryListQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!query.success) {
    return apiError("VALIDATION", "Invalid search.", 422, z.flattenError(query.error).fieldErrors);
  }

  try {
    return apiSuccess(await listCategories(query.data));
  } catch (error) {
    return apiErrorFrom(error, "GET /admin/categories");
  }
}

export async function POST(req: NextRequest) {
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

  try {
    const result = await createCategory(input.data);
    refreshStorefrontCatalogue();
    return apiSuccess(result, 201);
  } catch (error) {
    return apiErrorFrom(error, "POST /admin/categories");
  }
}
