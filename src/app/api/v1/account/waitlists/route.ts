import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { authorizeApi } from "@/lib/auth/session";
import { listMyWaitlists } from "@/services/waitlist.service";
import { myWaitlistsQuerySchema } from "@/validators/waitlist.validator";

export async function GET(req: NextRequest) {
  const auth = await authorizeApi();
  if (!auth.ok) return auth.response;

  const query = myWaitlistsQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!query.success) {
    return apiError("VALIDATION", "Invalid page.", 422, z.flattenError(query.error).fieldErrors);
  }

  try {
    return apiSuccess(await listMyWaitlists(auth.session.user, query.data));
  } catch (error) {
    return apiErrorFrom(error, "GET /account/waitlists");
  }
}
