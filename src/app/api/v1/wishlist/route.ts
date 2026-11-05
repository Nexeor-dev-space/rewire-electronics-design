import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { listSavedShopProducts } from "@/services/catalogue.service";
import { wishlistQuerySchema } from "@/validators/catalogue.validator";

/**
 * The wishlist's product cards. The list itself lives in the browser
 * (docs/WISHLIST.md); this only turns its slugs into current cards. Public,
 * like the shop, and capped at `WISHLIST_MAX_ITEMS`.
 */
export async function GET(req: NextRequest) {
  const query = wishlistQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!query.success) {
    return apiError("VALIDATION", "Invalid wishlist.", 422, z.flattenError(query.error).fieldErrors);
  }

  try {
    return apiSuccess(await listSavedShopProducts(query.data.slugs));
  } catch (error) {
    return apiErrorFrom(error, "GET /wishlist");
  }
}
