import { after, type NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api/api-response";
import { limitByIp } from "@/lib/rate-limit";
import { requestPasswordReset } from "@/services/auth.service";
import { forgotPasswordSchema } from "@/validators/auth.validator";

export async function POST(req: NextRequest) {
  const limited = limitByIp(req, "forgotPassword");
  if (limited) return limited;

  const input = forgotPasswordSchema.safeParse(await req.json().catch(() => null));
  if (!input.success) {
    return apiError("VALIDATION", "Enter a valid email address.", 422,
      z.flattenError(input.error).fieldErrors);
  }

  const { email } = input.data;
  after(() =>
    requestPasswordReset(email).catch((error: unknown) =>
      console.error("POST /auth/forgot-password reset email failed", error),
    ),
  );
  return apiSuccess({ sent: true });
}
