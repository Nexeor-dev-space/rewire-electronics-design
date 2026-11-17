import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { recordAudit } from "@/services/audit.service";
import { createTicket, listTickets, ticketAuditView } from "@/services/support.service";
import { createTicketSchema, ticketListQuerySchema } from "@/validators/support.validator";

export async function GET(req: NextRequest) {
  const auth = await authorizeApi(PERMISSIONS.support);
  if (!auth.ok) return auth.response;

  const query = ticketListQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!query.success) {
    return apiError("VALIDATION", "Invalid search.", 422, z.flattenError(query.error).fieldErrors);
  }

  try {
    return apiSuccess(await listTickets(auth.session.user.id, query.data));
  } catch (error) {
    return apiErrorFrom(error, "GET /admin/support");
  }
}

export async function POST(req: NextRequest) {
  const auth = await authorizeApi(PERMISSIONS.support, "CREATE");
  if (!auth.ok) return auth.response;

  const input = createTicketSchema.safeParse(await req.json().catch(() => null));
  if (!input.success) {
    return apiError("VALIDATION", "Please check the highlighted fields.", 422, z.flattenError(input.error).fieldErrors);
  }

  try {
    const ticket = await createTicket(input.data, auth.session.user.id);
    await recordAudit(auth.session.user, {
      action: "CREATE",
      module: PERMISSIONS.support,
      recordId: ticket.number,
      recordLabel: ticket.number,
      after: ticketAuditView(ticket),
    });
    return apiSuccess(ticket, 201);
  } catch (error) {
    return apiErrorFrom(error, "POST /admin/support");
  }
}
