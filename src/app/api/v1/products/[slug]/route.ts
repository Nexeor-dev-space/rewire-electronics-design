import type { NextRequest } from "next/server";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { findShopProduct } from "@/services/catalogue.service";
import { slugValidator } from "@/validators/common/primitives.validator";

type Params = { params: Promise<{ slug: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const slug = slugValidator.safeParse((await params).slug);
  if (!slug.success) return apiError("NOT_FOUND", "We couldn't find that product.", 404);

  try {
    const product = await findShopProduct(slug.data);
    if (!product) return apiError("NOT_FOUND", "We couldn't find that product.", 404);
    return apiSuccess(product);
  } catch (error) {
    return apiErrorFrom(error, "GET /products/[slug]");
  }
}
