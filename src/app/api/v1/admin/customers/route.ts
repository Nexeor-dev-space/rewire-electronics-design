import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { createCustomer, listCustomers } from "@/services/customer.service";
import { customerListQuerySchema, customerSchema } from "@/validators/customer.validator";

export async function GET(req: NextRequest) {
  const auth = await authorizeApi(PERMISSIONS.customers);
  if (!auth.ok) return auth.response;

  const query = customerListQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!query.success) {
    return apiError("VALIDATION", "Invalid search.", 422, z.flattenError(query.error).fieldErrors);
  }

  try {
    return apiSuccess(await listCustomers(query.data));
  } catch (error) {
    return apiErrorFrom(error, "GET /admin/customers");
  }
}

export async function POST(req: NextRequest) {
  const auth = await authorizeApi(PERMISSIONS.customers);
  if (!auth.ok) return auth.response;

  const input = customerSchema.safeParse(await req.json().catch(() => null));
  if (!input.success) {
    return apiError("VALIDATION", "Please check the highlighted fields.", 422,
      z.flattenError(input.error).fieldErrors);
  }

  try {
    return apiSuccess(await createCustomer(auth.session.user, input.data), 201);
  } catch (error) {
    return apiErrorFrom(error, "POST /admin/customers");
  }
}
