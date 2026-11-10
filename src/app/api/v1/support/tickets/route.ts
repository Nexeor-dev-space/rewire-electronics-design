import { after, type NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { getSession } from "@/lib/auth/session";
import { limitByEmail, limitByIp, limitByUser } from "@/lib/rate-limit";
import { submitCustomerTicket } from "@/services/support.service";
import { customerTicketSchema } from "@/validators/support.validator";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    const limited = session ? limitByUser(session.user.id, "createSupportTicket") : limitByIp(req, "createSupportTicket");
    if (limited) return limited;

    const input = customerTicketSchema.safeParse(await req.json().catch(() => null));
    if (!input.success) {
      return apiError("VALIDATION", "Please check the highlighted fields.", 422, z.flattenError(input.error).fieldErrors);
    }

    const emailLimited = limitByEmail(input.data.customerEmail, "createSupportTicket");
    if (emailLimited) return emailLimited;

    const { result, notifySupport } = await submitCustomerTicket(input.data, session?.user.email ?? null);
    after(() => notifySupport().catch((error: unknown) => console.error("POST /support/tickets email failed", error)));
    return apiSuccess(result, 201);
  } catch (error) {
    return apiErrorFrom(error, "POST /support/tickets");
  }
}
