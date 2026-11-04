import { after, type NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { getSession } from "@/lib/auth/session";
import { limitByIp, limitByUser } from "@/lib/rate-limit";
import { joinWaitlist } from "@/services/waitlist.service";
import { slugValidator } from "@/validators/common/primitives.validator";
import { joinWaitlistSchema } from "@/validators/waitlist.validator";

type Params = { params: Promise<{ slug: string }> };

const MESSAGE_NOT_FOUND = "This release isn't open for sign ups.";

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    const limited = session ? limitByUser(session.user.id, "joinWaitlist") : limitByIp(req, "joinWaitlist");
    if (limited) return limited;

    const slug = slugValidator.safeParse((await params).slug);
    if (!slug.success) return apiError("NOT_FOUND", MESSAGE_NOT_FOUND, 404);

    const input = joinWaitlistSchema.safeParse(await req.json().catch(() => null));
    if (!input.success) {
      return apiError("VALIDATION", "Please check the highlighted fields.", 422,
        z.flattenError(input.error).fieldErrors);
    }

    const { result, sendConfirmEmail } = await joinWaitlist(slug.data, input.data, session);
    if (sendConfirmEmail) {
      after(() =>
        sendConfirmEmail().catch((error: unknown) =>
          console.error("POST /releases/[slug]/waitlist confirm email failed", error),
        ),
      );
    }
    return apiSuccess(result);
  } catch (error) {
    return apiErrorFrom(error, "POST /releases/[slug]/waitlist");
  }
}
