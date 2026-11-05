import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { recordAudit } from "@/services/audit.service";
import { changeTicketStatus, getTicket, ticketAuditView } from "@/services/support.service";
import { ticketNumberParamsSchema, ticketStatusSchema } from "@/validators/support.validator";

type Params = { params: Promise<{ number: string }> };

const MESSAGE_NOT_FOUND = "We couldn't find that ticket.";

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await authorizeApi(PERMISSIONS.support, "EDIT");
  if (!auth.ok) return auth.response;

  const parsed = ticketNumberParamsSchema.safeParse(await params);
  if (!parsed.success) return apiError("NOT_FOUND", MESSAGE_NOT_FOUND, 404);

  const input = ticketStatusSchema.safeParse(await req.json().catch(() => null));
  if (!input.success) {
    return apiError("VALIDATION", "Please check the highlighted fields.", 422, z.flattenError(input.error).fieldErrors);
  }

  const { number } = parsed.data;
  try {
    const before = await getTicket(number);
    const result = await changeTicketStatus(number, input.data.status, auth.session.user.id);
    await recordAudit(auth.session.user, {
      action: "UPDATE",
      module: PERMISSIONS.support,
      recordId: number,
      recordLabel: number,
      before: ticketAuditView(before),
      after: ticketAuditView(result),
    });
    return apiSuccess(result);
  } catch (error) {
    return apiErrorFrom(error, "PATCH /admin/support/[number]/status");
  }
}
