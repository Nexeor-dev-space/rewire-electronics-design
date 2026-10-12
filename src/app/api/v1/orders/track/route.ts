import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { limitByIp } from "@/lib/rate-limit";
import { trackOrder } from "@/services/order.service";
import { trackOrderSchema } from "@/validators/order.validator";

export async function POST(req: NextRequest) {
  const limited = limitByIp(req, "trackOrder");
  if (limited) return limited;

  const input = trackOrderSchema.safeParse(await req.json().catch(() => null));
  if (!input.success) {
    return apiError("VALIDATION", "Please check the highlighted fields.", 422,
      z.flattenError(input.error).fieldErrors);
  }

  try {
    return apiSuccess(await trackOrder(input.data.number, input.data.email));
  } catch (error) {
    return apiErrorFrom(error, "POST /orders/track");
  }
}
