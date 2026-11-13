import type { Metadata } from "next";
import { CheckoutView } from "@/components/checkout/checkout-view";
import type { PaymentOption } from "@/components/checkout/checkout-view";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Complete your Rewire order — secure, tracked, and covered.",
  robots: { index: false, follow: false },
};

/** Payment methods — categories, no invented provider brand marks. */
const PAYMENT: PaymentOption[] = [
  {
    value: "CARD",
    label: "Credit or debit card",
    supporting: "Visa, Mastercard, Amex",
  },
  {
    value: "APPLE_PAY",
    label: "Apple Pay",
    supporting: "One-tap on supported devices",
  },
  {
    value: "COD",
    label: "Cash on delivery",
    supporting: "Pay when the parcel arrives, UAE only",
  },
];

export default function CheckoutPage() {
  return <CheckoutView payment={PAYMENT} />;
}
