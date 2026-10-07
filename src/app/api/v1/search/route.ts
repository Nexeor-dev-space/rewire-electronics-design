import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { limitByIp } from "@/lib/rate-limit";
import { listSearchSuggestions } from "@/services/catalogue.service";
import { searchSuggestQuerySchema } from "@/validators/catalogue.validator";

export async function GET(req: NextRequest) {
  const limited = limitByIp(req, "search");
  if (limited) return limited;

  const query = searchSuggestQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!query.success) {
    return apiError("VALIDATION", "Invalid search.", 422, z.flattenError(query.error).fieldErrors);
  }

  try {
    return apiSuccess(await listSearchSuggestions(query.data.q));
  } catch (error) {
    return apiErrorFrom(error, "GET /search");
  }
}
