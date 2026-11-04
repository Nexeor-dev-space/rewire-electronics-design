import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { authorizeApi } from "@/lib/auth/session";
import { deleteMyWaitlist, updateMyWaitlist } from "@/services/waitlist.service";
import { updateWaitlistSchema, waitlistEntryParamsSchema } from "@/validators/waitlist.validator";

type Params = { params: Promise<{ id: string }> };

const MESSAGE_NOT_FOUND = "We couldn't find that waitlist entry.";

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await authorizeApi();
  if (!auth.ok) return auth.response;

  const path = waitlistEntryParamsSchema.safeParse(await params);
  if (!path.success) return apiError("NOT_FOUND", MESSAGE_NOT_FOUND, 404);

  const input = updateWaitlistSchema.safeParse(await req.json().catch(() => null));
  if (!input.success) {
    return apiError("VALIDATION", "Please check the highlighted fields.", 422,
      z.flattenError(input.error).fieldErrors);
  }

  try {
    return apiSuccess(await updateMyWaitlist(auth.session.user, path.data.id, input.data));
  } catch (error) {
    return apiErrorFrom(error, "PATCH /account/waitlists/[id]");
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const auth = await authorizeApi();
  if (!auth.ok) return auth.response;

  const path = waitlistEntryParamsSchema.safeParse(await params);
  if (!path.success) return apiError("NOT_FOUND", MESSAGE_NOT_FOUND, 404);

  try {
    return apiSuccess(await deleteMyWaitlist(auth.session.user, path.data.id));
  } catch (error) {
    return apiErrorFrom(error, "DELETE /account/waitlists/[id]");
  }
}
