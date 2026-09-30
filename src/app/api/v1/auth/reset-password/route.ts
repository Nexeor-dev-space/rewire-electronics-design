import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { resetPassword } from "@/services/auth.service";
import { resetPasswordSchema } from "@/validators/auth.validator";

export async function POST(req: NextRequest) {
  const input = resetPasswordSchema.safeParse(await req.json().catch(() => null));
  if (!input.success) {
    return apiError("VALIDATION", "Please check the highlighted fields.", 422,
      z.flattenError(input.error).fieldErrors);
  }

  try {
    await resetPassword(input.data.token, input.data.password);
    return apiSuccess({ reset: true });
  } catch (error) {
    return apiErrorFrom(error, "POST /auth/reset-password");
  }
}
