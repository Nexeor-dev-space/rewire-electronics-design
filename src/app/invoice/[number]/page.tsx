import type { Metadata } from "next";
import { SignInRedirect } from "@/components/auth/sign-in-redirect";
import { OrderInvoice } from "@/components/order/order-invoice";
import { getSession, hasSessionCookie } from "@/lib/auth/session";
import { NOINDEX_ROBOTS } from "@/lib/constants";
import { invoiceNumber } from "@/lib/orders";

interface Params {
  params: Promise<{ number: string }>;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { number } = await params;
  // The title is the file name the browser suggests when saving the PDF.
  return { title: `Invoice ${invoiceNumber(number.toUpperCase())}`, robots: NOINDEX_ROBOTS };
}

/**
 * The tax invoice of one of the signed in account's orders, outside the
 * `(site)` chrome so the page is only the A4 sheet. Gated like `/account/*`:
 * signed out, the invoice is never rendered.
 */
export default async function InvoicePage({ params }: Params) {
  const session = await getSession();
  if (!session) return <SignInRedirect expired={await hasSessionCookie()} />;

  const { number } = await params;
  return <OrderInvoice number={number} />;
}
