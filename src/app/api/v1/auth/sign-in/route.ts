import { randomBytes } from "node:crypto";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { canAccessAdmin } from "@/lib/auth/permissions";
import { startSession } from "@/lib/auth/session";
import { ACCOUNT_HOME_PATH, AUTH_TOKEN_BYTES } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { limitByIp } from "@/lib/rate-limit";
import { adoptGuestCart } from "@/services/cart.service";
import type { SignInResult } from "@/types/auth";
import { signInSchema } from "@/validators/auth.validator";

let dummyHash: Promise<string> | undefined;

function dummyPasswordHash(): Promise<string> {
  dummyHash ??= hashPassword(randomBytes(AUTH_TOKEN_BYTES).toString("hex"));
  return dummyHash;
}

export async function POST(req: NextRequest) {
  const limited = limitByIp(req, "signIn");
  if (limited) return limited;

  const input = signInSchema.safeParse(await req.json().catch(() => null));
  if (!input.success) {
    return apiError("VALIDATION", "Enter your email and password.", 422,
      z.flattenError(input.error).fieldErrors);
  }

  try {
    const user = await prisma.user.findFirst({
      where: { email: input.data.email, state: "ACTIVE" },
      select: { id: true, role: true, passwordHash: true, sessionVersion: true },
    });

    const stored = user?.passwordHash ?? (await dummyPasswordHash());
    const valid = await verifyPassword(input.data.password, stored);
    if (!user?.passwordHash || !valid) {
      return apiError("UNAUTHENTICATED", "That email and password don't match an account.", 401);
    }

    await startSession(user.id, user.sessionVersion);
    await adoptGuestCart(user.id);
    return apiSuccess<SignInResult>({ redirectTo: canAccessAdmin(user.role) ? "/admin" : ACCOUNT_HOME_PATH });
  } catch (error) {
    return apiErrorFrom(error, "POST /auth/sign-in");
  }
}
