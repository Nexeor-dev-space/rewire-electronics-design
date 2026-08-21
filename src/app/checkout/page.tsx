import type { Metadata } from "next";
import { CheckoutHeader } from "@/components/checkout/checkout-header";
import { CheckoutView } from "@/components/checkout/checkout-view";
import { TrustFooter } from "@/components/checkout/trust-footer";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Complete your Rewire order — secure, tracked, and covered.",
  robots: { index: false, follow: false },
};

/** UAE standard VAT — 5% on the discounted subtotal. */
const VAT_RATE = 0.05;

/** Delivery options — labels only, no invented partner names. */
const DELIVERY = [
  {
    value: "standard",
    label: "Standard delivery",
    supporting: "Tracked, 2–4 working days",
    estimate: "2–4 working days",
    trailing: "Free",
    price: 0,
  },
  {
    value: "express",
    label: "Express delivery",
    supporting: "Tracked, 1–2 working days",
    estimate: "1–2 working days",
    trailing: "AED 35",
    price: 35_00,
  },
  {
    value: "collect",
    label: "Collect in Dubai",
    supporting: "Ready in 24 hours at the workshop",
    estimate: "Ready within 24 hours",
    trailing: "Free",
    price: 0,
  },
];

/** Payment methods — categories, no invented provider brand marks. */
const PAYMENT = [
  {
    value: "card",
    label: "Credit or debit card",
    supporting: "Visa, Mastercard, Amex",
  },
  {
    value: "apple-pay",
    label: "Apple Pay",
    supporting: "One-tap on supported devices",
  },
  {
    value: "cod",
    label: "Cash on delivery",
    supporting: "Pay when the parcel arrives, UAE only",
  },
];

export default function CheckoutPage() {
  return (
    <>
      <CheckoutHeader />
      <div className="flex-1">
        <CheckoutView
          delivery={DELIVERY}
          payment={PAYMENT}
          vatRate={VAT_RATE}
        />
      </div>
      <TrustFooter />
    </>
  );
}
