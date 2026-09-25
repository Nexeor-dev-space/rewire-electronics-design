import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { createAddOn, listAddOns } from "@/services/add-on.service";
import { addOnListQuerySchema, addOnSchema } from "@/validators/add-on.validator";

export async function GET(req: NextRequest) {
  const auth = await authorizeApi(PERMISSIONS.addOns);
  if (!auth.ok) return auth.response;

  const query = addOnListQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!query.success) {
    return apiError("VALIDATION", "Invalid search.", 422, z.flattenError(query.error).fieldErrors);
  }

  try {
    return apiSuccess(await listAddOns(query.data));
  } catch (error) {
    return apiErrorFrom(error, "GET /admin/add-ons");
  }
}

export async function POST(req: NextRequest) {
  const auth = await authorizeApi(PERMISSIONS.addOns);
  if (!auth.ok) return auth.response;

  const input = addOnSchema.safeParse(await req.json().catch(() => null));
  if (!input.success) {
    return apiError(
      "VALIDATION",
      "Please check the highlighted fields.",
      422,
      z.flattenError(input.error).fieldErrors,
    );
  }

  try {
    return apiSuccess(await createAddOn(input.data), 201);
  } catch (error) {
    return apiErrorFrom(error, "POST /admin/add-ons");
  }
}
