import { after, type NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { startSession } from "@/lib/auth/session";
import { ACCOUNT_HOME_PATH } from "@/lib/constants";
import { limitByIp } from "@/lib/rate-limit";
import { registerCustomer, sendVerificationEmail } from "@/services/auth.service";
import { adoptGuestCart } from "@/services/cart.service";
import type { SignInResult } from "@/types/auth";
import { signUpSchema } from "@/validators/auth.validator";

export async function POST(req: NextRequest) {
  const limited = limitByIp(req, "signUp");
  if (limited) return limited;

  const input = signUpSchema.safeParse(await req.json().catch(() => null));
  if (!input.success) {
    return apiError("VALIDATION", "Please check the highlighted fields.", 422,
      z.flattenError(input.error).fieldErrors);
  }

  try {
    const { user, token } = await registerCustomer(input.data);
    await startSession(user.id, user.sessionVersion);
    await adoptGuestCart(user.id);
    after(() =>
      sendVerificationEmail(user, token).catch((error: unknown) =>
        console.error("POST /auth/sign-up verification email failed", error),
      ),
    );
    return apiSuccess<SignInResult>({ redirectTo: ACCOUNT_HOME_PATH }, 201);
  } catch (error) {
    return apiErrorFrom(error, "POST /auth/sign-up");
  }
}
