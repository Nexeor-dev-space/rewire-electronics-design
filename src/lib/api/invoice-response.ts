import "server-only";

import type { RenderedInvoice } from "@/services/invoice.service";

/**
 * A rendered invoice as a PDF download. `private, no-store`: an invoice is
 * personal, and payment status on it can change between downloads.
 */
export function invoiceResponse({ fileName, pdf }: RenderedInvoice): Response {
  return new Response(new Blob([new Uint8Array(pdf)], { type: "application/pdf" }), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
