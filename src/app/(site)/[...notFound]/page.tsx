import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NOINDEX_ROBOTS } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Page not found",
  robots: NOINDEX_ROBOTS,
};

/**
 * Catch-all for URLs no storefront route owns. Without it Next renders
 * its bare default 404 outside the `(site)` layout, with no header or
 * footer. Forwarding to `notFound()` here shows `../not-found.tsx` inside
 * the site chrome instead. Admin and API paths match their own routes
 * first and never reach this.
 */
export default function UnknownStorefrontRoute() {
  notFound();
}
