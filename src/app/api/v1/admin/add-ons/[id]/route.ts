import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { deleteAddOn, getAddOn, updateAddOn } from "@/services/add-on.service";
import { addOnSchema } from "@/validators/add-on.validator";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await authorizeApi(PERMISSIONS.addOns);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  try {
    return apiSuccess(await getAddOn(id));
  } catch (error) {
    return apiErrorFrom(error, "GET /admin/add-ons/[id]");
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
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

  const { id } = await params;
  try {
    return apiSuccess(await updateAddOn(id, input.data));
  } catch (error) {
    return apiErrorFrom(error, "PUT /admin/add-ons/[id]");
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const auth = await authorizeApi(PERMISSIONS.addOns);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  try {
    return apiSuccess(await deleteAddOn(id));
  } catch (error) {
    return apiErrorFrom(error, "DELETE /admin/add-ons/[id]");
  }
}
