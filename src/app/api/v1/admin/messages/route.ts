import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { listMessages } from "@/services/message.service";
import { messageListQuerySchema } from "@/validators/message.validator";

/** The message history: every automated email and WhatsApp message, with its outcome. */
export async function GET(req: NextRequest) {
  const auth = await authorizeApi(PERMISSIONS.messages);
  if (!auth.ok) return auth.response;

  const query = messageListQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!query.success) {
    return apiError("VALIDATION", "Invalid filters.", 422, z.flattenError(query.error).fieldErrors);
  }

  try {
    return apiSuccess(await listMessages(query.data));
  } catch (error) {
    return apiErrorFrom(error, "GET /admin/messages");
  }
}
