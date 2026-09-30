import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { resolveCartOwner } from "@/lib/cart-owner";
import { quoteCart } from "@/services/cart.service";
import { cartQuoteQuerySchema } from "@/validators/cart.validator";

export async function GET(req: NextRequest) {
  const query = cartQuoteQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!query.success) {
    return apiError("VALIDATION", "Choose an emirate and a delivery method.", 422,
      z.flattenError(query.error).fieldErrors);
  }

  try {
    return apiSuccess(await quoteCart(await resolveCartOwner(), query.data));
  } catch (error) {
    return apiErrorFrom(error, "GET /cart/quote");
  }
}
