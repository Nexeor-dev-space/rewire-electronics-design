import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { resolveCartOwner } from "@/lib/cart-owner";
import { removeCartItem, updateCartItem } from "@/services/cart.service";
import { cartItemParamsSchema, updateCartItemSchema } from "@/validators/cart.validator";

type Params = { params: Promise<{ id: string }> };

const MESSAGE_NOT_IN_CART = "That item isn't in your cart.";

export async function PATCH(req: NextRequest, { params }: Params) {
  const path = cartItemParamsSchema.safeParse(await params);
  if (!path.success) return apiError("NOT_FOUND", MESSAGE_NOT_IN_CART, 404);

  const input = updateCartItemSchema.safeParse(await req.json().catch(() => null));
  if (!input.success) {
    return apiError("VALIDATION", "Please check the item and try again.", 422,
      z.flattenError(input.error).fieldErrors);
  }

  try {
    const owner = await resolveCartOwner();
    return apiSuccess(await updateCartItem(owner, path.data.id, input.data));
  } catch (error) {
    return apiErrorFrom(error, "PATCH /cart/items/[id]");
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const path = cartItemParamsSchema.safeParse(await params);
  if (!path.success) return apiError("NOT_FOUND", MESSAGE_NOT_IN_CART, 404);

  try {
    const owner = await resolveCartOwner();
    return apiSuccess(await removeCartItem(owner, path.data.id));
  } catch (error) {
    return apiErrorFrom(error, "DELETE /cart/items/[id]");
  }
}
