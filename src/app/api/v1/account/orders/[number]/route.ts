import type { NextRequest } from "next/server";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { authorizeApi } from "@/lib/auth/session";
import { getAccountOrder } from "@/services/order.service";
import { orderNumberParamsSchema } from "@/validators/order.validator";

type Params = { params: Promise<{ number: string }> };

const MESSAGE_NOT_FOUND = "We couldn't find that order.";

export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await authorizeApi();
  if (!auth.ok) return auth.response;

  const parsed = orderNumberParamsSchema.safeParse(await params);
  if (!parsed.success) return apiError("NOT_FOUND", MESSAGE_NOT_FOUND, 404);

  try {
    return apiSuccess(await getAccountOrder(auth.session.user, parsed.data.number));
  } catch (error) {
    return apiErrorFrom(error, "GET /account/orders/[number]");
  }
}
