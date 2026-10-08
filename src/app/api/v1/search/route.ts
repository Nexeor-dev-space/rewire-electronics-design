import type { NextRequest } from "next/server";
import { apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { limitByIp } from "@/lib/rate-limit";
import { searchSuggestions } from "@/services/catalogue.service";
import { searchSuggestionsQuerySchema } from "@/validators/catalogue.validator";

/** Public. Products, brands and categories matching `q`, for the search panel. */
export async function GET(req: NextRequest) {
  const limited = limitByIp(req, "search");
  if (limited) return limited;

  const { q } = searchSuggestionsQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams));

  try {
    return apiSuccess(await searchSuggestions(q));
  } catch (error) {
    return apiErrorFrom(error, "GET /search");
  }
}
