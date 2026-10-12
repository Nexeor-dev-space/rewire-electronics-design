import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { authorizeApi } from "@/lib/auth/session";
import { limitByUser } from "@/lib/rate-limit";
import { createReturn, listAccountReturns } from "@/services/return.service";
import { accountReturnsQuerySchema, createReturnSchema } from "@/validators/return.validator";

export async function GET(req: NextRequest) {
  const auth = await authorizeApi();
  if (!auth.ok) return auth.response;

  const query = accountReturnsQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!query.success) {
    return apiError("VALIDATION", "Invalid filter.", 422, z.flattenError(query.error).fieldErrors);
  }

  try {
    return apiSuccess(await listAccountReturns(auth.session.user, query.data));
  } catch (error) {
    return apiErrorFrom(error, "GET /account/returns");
  }
}

export async function POST(req: NextRequest) {
  const auth = await authorizeApi();
  if (!auth.ok) return auth.response;

  const limited = limitByUser(auth.session.user.id, "returnRequest");
  if (limited) return limited;

  const input = createReturnSchema.safeParse(await req.json().catch(() => null));
  if (!input.success) {
    return apiError(
      "VALIDATION",
      "Please check the highlighted fields.",
      422,
      z.flattenError(input.error).fieldErrors,
    );
  }

  try {
    return apiSuccess(await createReturn(auth.session.user, input.data), 201);
  } catch (error) {
    return apiErrorFrom(error, "POST /account/returns");
  }
}
