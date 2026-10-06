import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { authorizeApi, forbidden } from "@/lib/auth/session";
import { recordAudit } from "@/services/audit.service";
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
  const auth = await authorizeApi(PERMISSIONS.categories, "CREATE");
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

  // Anything but a draft goes live or is archived, which is a publish.
  const canPublish = hasPermission(auth.session.user.permissions, PERMISSIONS.categories, "PUBLISH");
  if (!canPublish && input.data.status !== "DRAFT") return forbidden();

  try {
    const result = await createCategory(input.data);
    await recordAudit(auth.session.user, {
      action: "CREATE",
      module: PERMISSIONS.categories,
      recordId: result.id,
      recordLabel: result.name,
      after: result,
    });
    refreshStorefrontCatalogue();
    return apiSuccess(result, 201);
  } catch (error) {
    return apiErrorFrom(error, "POST /admin/categories");
  }
}
