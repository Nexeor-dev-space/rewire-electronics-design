"use client";

import { useDownloadInvoice } from "@/hooks/use-order";
import { cn } from "@/lib/utils";

/** Phones and tablets: the primary pointer is a finger. */
const TOUCH_QUERY = "(pointer: coarse)";

/**
 * Download invoice — shared by the account and admin order pages.
 *
 * On a touch device it opens the PDF in a new tab (`viewHref`, served
 * inline), where the browser's viewer offers save and share. In-app browsers
 * (a link opened from WhatsApp, Gmail…) ignore downloads a page starts
 * itself but do follow a link to a PDF. If the new tab is blocked, it opens
 * in the same tab.
 *
 * Elsewhere it fetches the PDF through `useDownloadInvoice` and saves it,
 * so a failure shows as a message under the button instead of the browser
 * saving an error file.
 */
export function InvoiceDownloadButton({
  href,
  viewHref,
  label = "Download invoice",
  className,
}: {
  /** The invoice endpoint from `API_ENDPOINTS`, as a download. */
  href: string;
  /** The same endpoint with `inline` set, for phones. */
  viewHref: string;
  label?: string;
  className?: string;
}) {
  const download = useDownloadInvoice();

  function handleClick() {
    if (window.matchMedia(TOUCH_QUERY).matches) {
      if (!window.open(viewHref, "_blank")) window.location.assign(viewHref);
      return;
    }
    download.mutate(href);
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleClick}
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
