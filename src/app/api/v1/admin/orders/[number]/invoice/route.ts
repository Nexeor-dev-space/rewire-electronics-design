import type { NextRequest } from "next/server";
import { apiError, apiErrorFrom } from "@/lib/api/api-response";
import { invoiceResponse } from "@/lib/api/invoice-response";
import { INVOICE_INLINE_PARAM } from "@/lib/constants";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { renderAdminInvoice } from "@/services/invoice.service";
import { orderNumberParamsSchema } from "@/validators/order.validator";

type Params = { params: Promise<{ number: string }> };

/** Any order's tax invoice as a PDF, for staff who can view Orders. */
export async function GET(req: NextRequest, { params }: Params) {
  const auth = await authorizeApi(PERMISSIONS.orders);
  if (!auth.ok) return auth.response;

  const parsed = orderNumberParamsSchema.safeParse(await params);
  if (!parsed.success) return apiError("NOT_FOUND", "We couldn't find that order.", 404);

  try {
    const inline = req.nextUrl.searchParams.get(INVOICE_INLINE_PARAM) === "1";
    return invoiceResponse(await renderAdminInvoice(parsed.data.number), inline);
  } catch (error) {
    return apiErrorFrom(error, "GET /admin/orders/[number]/invoice");
  }
}
