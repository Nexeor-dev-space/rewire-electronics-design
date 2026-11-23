import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { resetGuide, saveGuide } from "@/services/help-guide.service";
import { helpGuideParamsSchema, helpGuideSchema } from "@/validators/help-guide.validator";

type Params = { params: Promise<{ audience: string; slug: string }> };

async function readParams(params: Params["params"]) {
  return helpGuideParamsSchema.safeParse(await params);
}

const notFound = () => apiError("NOT_FOUND", "We couldn't find that guide.", 404);

/** Replaces the whole guide. */
export async function PUT(req: NextRequest, { params }: Params) {
  const auth = await authorizeApi(PERMISSIONS.helpGuides, "EDIT");
  if (!auth.ok) return auth.response;

  const target = await readParams(params);
  if (!target.success) return notFound();

  const input = helpGuideSchema.safeParse(await req.json().catch(() => null));
  if (!input.success) {
    return apiError("VALIDATION", "Please check the highlighted fields.", 422, z.flattenError(input.error).fieldErrors);
  }

  try {
    return apiSuccess(await saveGuide(auth.session.user, target.data.audience, target.data.slug, input.data));
  } catch (error) {
    return apiErrorFrom(error, "PUT /admin/help-guides");
  }
}

/** Removes the staff edits, so the built in text shows again. */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const auth = await authorizeApi(PERMISSIONS.helpGuides, "EDIT");
  if (!auth.ok) return auth.response;

  const target = await readParams(params);
  if (!target.success) return notFound();

  try {
    return apiSuccess(await resetGuide(auth.session.user, target.data.audience, target.data.slug));
  } catch (error) {
    return apiErrorFrom(error, "DELETE /admin/help-guides");
  }
}
