import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { deleteCustomer, getCustomer, updateCustomer } from "@/services/customer.service";
import { customerSchema } from "@/validators/customer.validator";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await authorizeApi(PERMISSIONS.customers);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  try {
    return apiSuccess(await getCustomer(id));
  } catch (error) {
    return apiErrorFrom(error, "GET /admin/customers/[id]");
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await authorizeApi(PERMISSIONS.customers);
  if (!auth.ok) return auth.response;

  const input = customerSchema.safeParse(await req.json().catch(() => null));
  if (!input.success) {
    return apiError("VALIDATION", "Please check the highlighted fields.", 422,
      z.flattenError(input.error).fieldErrors);
  }

  const { id } = await params;
  try {
    return apiSuccess(await updateCustomer(auth.session.user, id, input.data));
  } catch (error) {
    return apiErrorFrom(error, "PATCH /admin/customers/[id]");
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const auth = await authorizeApi(PERMISSIONS.customers);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  try {
    return apiSuccess(await deleteCustomer(auth.session.user, id));
  } catch (error) {
    return apiErrorFrom(error, "DELETE /admin/customers/[id]");
  }
}
