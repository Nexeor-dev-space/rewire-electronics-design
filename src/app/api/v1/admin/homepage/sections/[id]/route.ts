import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { deleteHomepageSection, updateHomepageSection } from "@/services/homepage.service";
import { homepageSectionSchema } from "@/validators/homepage.validator";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const auth = await authorizeApi(PERMISSIONS.homepage);
  if (!auth.ok) return auth.response;

  const input = homepageSectionSchema.safeParse(await req.json().catch(() => null));
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
    return apiSuccess(await updateHomepageSection(id, input.data));
  } catch (error) {
    return apiErrorFrom(error, "PUT /admin/homepage/sections/[id]");
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const auth = await authorizeApi(PERMISSIONS.homepage);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  try {
    return apiSuccess(await deleteHomepageSection(id));
  } catch (error) {
    return apiErrorFrom(error, "DELETE /admin/homepage/sections/[id]");
  }
}
