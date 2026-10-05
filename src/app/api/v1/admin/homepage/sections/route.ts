import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { addHomepageSection } from "@/services/homepage.service";
import { createHomepageSectionSchema } from "@/validators/homepage.validator";

export async function POST(req: NextRequest) {
  const auth = await authorizeApi(PERMISSIONS.homepage, "CREATE");
  if (!auth.ok) return auth.response;

  const input = createHomepageSectionSchema.safeParse(await req.json().catch(() => null));
  if (!input.success) {
    return apiError(
      "VALIDATION",
      "Please check the highlighted fields.",
      422,
      z.flattenError(input.error).fieldErrors,
    );
  }

  try {
    return apiSuccess(await addHomepageSection(input.data), 201);
  } catch (error) {
    return apiErrorFrom(error, "POST /admin/homepage/sections");
  }
}
