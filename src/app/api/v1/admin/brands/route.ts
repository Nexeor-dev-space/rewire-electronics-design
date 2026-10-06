import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { recordAudit } from "@/services/audit.service";
import { createBrand, listBrands } from "@/services/brand.service";
import { brandListQuerySchema, brandSchema } from "@/validators/brand.validator";

export async function GET(req: NextRequest) {
  const auth = await authorizeApi(PERMISSIONS.brands);
  if (!auth.ok) return auth.response;

  const query = brandListQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!query.success) {
    return apiError("VALIDATION", "Invalid search.", 422, z.flattenError(query.error).fieldErrors);
  }

  try {
    return apiSuccess(await listBrands(query.data));
  } catch (error) {
    return apiErrorFrom(error, "GET /admin/brands");
  }
}

export async function POST(req: NextRequest) {
  const auth = await authorizeApi(PERMISSIONS.brands, "CREATE");
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

  try {
    const result = await createBrand(input.data);
    await recordAudit(auth.session.user, {
      action: "CREATE",
      module: PERMISSIONS.brands,
      recordId: result.id,
      recordLabel: result.name,
      after: result,
    });
    return apiSuccess(result, 201);
  } catch (error) {
    return apiErrorFrom(error, "POST /admin/brands");
  }
}
