import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { authorizeApi } from "@/lib/auth/session";
import { listOwnAddresses, replaceOwnAddresses } from "@/services/user.service";
import { accountAddressesSchema } from "@/validators/user.validator";

/** The list is capped by `addressListSchema` (10), so it is returned whole. */
export async function GET() {
  const auth = await authorizeApi();
  if (!auth.ok) return auth.response;

  try {
    return apiSuccess(await listOwnAddresses(auth.session.user.id));
  } catch (error) {
    return apiErrorFrom(error, "GET /account/addresses");
  }
}

export async function PUT(req: NextRequest) {
  const auth = await authorizeApi();
  if (!auth.ok) return auth.response;

  const input = accountAddressesSchema.safeParse(await req.json().catch(() => null));
  if (!input.success) {
    return apiError(
      "VALIDATION",
      "Please check the highlighted fields.",
      422,
      z.flattenError(input.error).fieldErrors,
    );
  }

  try {
    return apiSuccess(await replaceOwnAddresses(auth.session.user.id, input.data.addresses));
  } catch (error) {
    return apiErrorFrom(error, "PUT /account/addresses");
  }
}
