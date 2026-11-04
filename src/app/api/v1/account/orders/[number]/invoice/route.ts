import type { NextRequest } from "next/server";
import { apiError, apiErrorFrom } from "@/lib/api/api-response";
import { authorizeApi } from "@/lib/auth/session";
import { invoiceResponse } from "@/lib/api/invoice-response";
import { INVOICE_INLINE_PARAM } from "@/lib/constants";
import { renderAccountInvoice } from "@/services/invoice.service";
import { orderNumberParamsSchema } from "@/validators/order.validator";

type Params = { params: Promise<{ number: string }> };

/**
 * The signed in customer's tax invoice as a PDF download. Raw bytes, not
 * `apiSuccess` — one of the binary responses listed in docs/DATA-LAYER.md.
 * Failures still use the standard error shape.
 */
export async function GET(req: NextRequest, { params }: Params) {
  const auth = await authorizeApi();
  if (!auth.ok) return auth.response;

  const parsed = orderNumberParamsSchema.safeParse(await params);
  if (!parsed.success) return apiError("NOT_FOUND", "We couldn't find that order.", 404);

  try {
    const inline = req.nextUrl.searchParams.get(INVOICE_INLINE_PARAM) === "1";
    return invoiceResponse(await renderAccountInvoice(auth.session.user, parsed.data.number), inline);
  } catch (error) {
    return apiErrorFrom(error, "GET /account/orders/[number]/invoice");
  }
}
