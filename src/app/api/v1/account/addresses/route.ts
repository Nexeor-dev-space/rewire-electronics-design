import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { authorizeApi } from "@/lib/auth/session";
import { listMyAddresses, saveMyAddresses } from "@/services/user.service";
import { myAddressesSchema } from "@/validators/user.validator";

export async function GET() {
  const auth = await authorizeApi();
  if (!auth.ok) return auth.response;

  try {
    return apiSuccess(await listMyAddresses(auth.session.user.id));
  } catch (error) {
    return apiErrorFrom(error, "GET /account/addresses");
  }
}

/** Replaces the whole list: addresses missing from the body are removed. */
export async function PUT(req: NextRequest) {
  const auth = await authorizeApi();
  if (!auth.ok) return auth.response;

  const input = myAddressesSchema.safeParse(await req.json().catch(() => null));
  if (!input.success) {
    return apiError("VALIDATION", "Please check the highlighted fields.", 422,
      z.flattenError(input.error).fieldErrors);
  }

  try {
    return apiSuccess(await saveMyAddresses(auth.session.user.id, input.data.addresses));
  } catch (error) {
    return apiErrorFrom(error, "PUT /account/addresses");
  }
}
