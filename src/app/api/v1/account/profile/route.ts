import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { authorizeApi } from "@/lib/auth/session";
import { updateMyProfile } from "@/services/user.service";
import { myProfileSchema } from "@/validators/user.validator";

export async function PATCH(req: NextRequest) {
  const auth = await authorizeApi();
  if (!auth.ok) return auth.response;

  const input = myProfileSchema.safeParse(await req.json().catch(() => null));
  if (!input.success) {
    return apiError("VALIDATION", "Please check the highlighted fields.", 422,
      z.flattenError(input.error).fieldErrors);
  }

  try {
    return apiSuccess(await updateMyProfile(auth.session.user.id, input.data));
  } catch (error) {
    return apiErrorFrom(error, "PATCH /account/profile");
  }
}
