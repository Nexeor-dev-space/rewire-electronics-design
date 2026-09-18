import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { deleteUser, getUser, updateUser } from "@/services/user.service";
import { userSchema } from "@/validators/user.validator";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await authorizeApi(PERMISSIONS.users);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  try {
    return apiSuccess(await getUser(id));
  } catch (error) {
    return apiErrorFrom(error, "GET /admin/users/[id]");
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await authorizeApi(PERMISSIONS.users);
  if (!auth.ok) return auth.response;

  const input = userSchema.safeParse(await req.json().catch(() => null));
  if (!input.success) {
    return apiError("VALIDATION", "Please check the highlighted fields.", 422,
      z.flattenError(input.error).fieldErrors);
  }

  const { id } = await params;
  try {
    return apiSuccess(await updateUser(auth.session.user, id, input.data));
  } catch (error) {
    return apiErrorFrom(error, "PATCH /admin/users/[id]");
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const auth = await authorizeApi(PERMISSIONS.users);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  try {
    return apiSuccess(await deleteUser(auth.session.user, id));
  } catch (error) {
    return apiErrorFrom(error, "DELETE /admin/users/[id]");
  }
}
