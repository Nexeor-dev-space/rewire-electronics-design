import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { verifyPassword } from "@/lib/auth/password";
import { canAccessAdmin } from "@/lib/auth/permissions";
import { startSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import type { SignInResult } from "@/types/auth";
import { signInSchema } from "@/validators/auth.validator";

export async function POST(req: NextRequest) {
  const input = signInSchema.safeParse(await req.json().catch(() => null));
  if (!input.success) {
    return apiError("VALIDATION", "Enter your email and password.", 422,
      z.flattenError(input.error).fieldErrors);
  }

  try {
    const user = await prisma.user.findFirst({
      where: { email: input.data.email, state: "ACTIVE" },
      select: { id: true, role: true, passwordHash: true },
    });

    const valid = user?.passwordHash && (await verifyPassword(input.data.password, user.passwordHash));
    if (!user || !valid) {
      return apiError("UNAUTHENTICATED", "That email and password don't match an account.", 401);
    }

    await startSession(user.id);
    return apiSuccess<SignInResult>({ redirectTo: canAccessAdmin(user.role) ? "/admin" : "/account" });
  } catch (error) {
    return apiErrorFrom(error, "POST /auth/sign-in");
  }
}
