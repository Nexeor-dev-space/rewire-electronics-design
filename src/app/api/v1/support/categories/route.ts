import { apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { listActiveCategories } from "@/services/support.service";

export async function GET() {
  try {
    return apiSuccess(await listActiveCategories());
  } catch (error) {
    return apiErrorFrom(error, "GET /support/categories");
  }
}
