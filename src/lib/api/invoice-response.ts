import "server-only";

import type { RenderedInvoice } from "@/services/invoice.service";

/**
 * A rendered invoice as a PDF. `private, no-store`: an invoice is personal,
 * and payment status on it can change between downloads.
 *
 * `inline` (the `?inline=1` query) lets the browser open it in its PDF
 * viewer; phones use this, because in-app browsers ignore downloads the
 * page starts itself. Otherwise it is an attachment, saved straight away.
 */
export function invoiceResponse({ fileName, pdf }: RenderedInvoice, inline = false): Response {
  return new Response(new Blob([new Uint8Array(pdf)], { type: "application/pdf" }), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${fileName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
