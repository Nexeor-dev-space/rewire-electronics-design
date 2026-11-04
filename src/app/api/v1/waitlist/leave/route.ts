import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { leaveWaitlist } from "@/services/waitlist.service";
import { waitlistTokenSchema } from "@/validators/waitlist.validator";

export async function POST(req: NextRequest) {
  const input = waitlistTokenSchema.safeParse(await req.json().catch(() => null));
  if (!input.success) {
    return apiError("VALIDATION", "This link has expired or is no longer valid.", 422,
      z.flattenError(input.error).fieldErrors);
  }

  try {
    await leaveWaitlist(input.data.token);
    return apiSuccess({ left: true });
  } catch (error) {
    return apiErrorFrom(error, "POST /waitlist/leave");
  }
}
