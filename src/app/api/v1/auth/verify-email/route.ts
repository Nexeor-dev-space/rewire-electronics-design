import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { verifyEmail } from "@/services/auth.service";
import { verifyEmailSchema } from "@/validators/auth.validator";

export async function POST(req: NextRequest) {
  const input = verifyEmailSchema.safeParse(await req.json().catch(() => null));
  if (!input.success) {
    return apiError("VALIDATION", "This link has expired or was already used.", 422,
      z.flattenError(input.error).fieldErrors);
  }

  try {
    await verifyEmail(input.data.token);
    return apiSuccess({ verified: true });
  } catch (error) {
    return apiErrorFrom(error, "POST /auth/verify-email");
  }
}
