"use client";

import { useDownloadInvoice } from "@/hooks/use-order";
import { cn } from "@/lib/utils";

/**
 * Download invoice — shared by the account and admin order pages. Fetches
 * the PDF through `useDownloadInvoice`, so a failure shows as a message
 * under the button instead of the browser saving an error file.
 */
export function InvoiceDownloadButton({
  href,
  label = "Download invoice",
  className,
}: {
  /** The account or admin invoice endpoint from `API_ENDPOINTS`. */
  href: string;
  label?: string;
  className?: string;
}) {
  const download = useDownloadInvoice();

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => download.mutate(href)}
        disabled={download.isPending}
        aria-busy={download.isPending}
        className={cn(className, "disabled:cursor-progress disabled:opacity-70")}
      >
        {download.isPending ? "Preparing invoice…" : label}
      </button>
      {download.isError && (
        <p role="alert" className="text-sm text-danger">
          {download.error.message}
        </p>
      )}
    </div>
  );
}
