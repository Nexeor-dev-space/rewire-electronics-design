import type { Metadata } from "next";
import { CheckoutHeader } from "@/components/checkout/checkout-header";
import { CheckoutView } from "@/components/checkout/checkout-view";
import { TrustFooter } from "@/components/checkout/trust-footer";
import { getCheckoutBag, totalsFor } from "@/lib/checkout";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Complete your Rewire order — secure, tracked, and covered.",
  robots: { index: false, follow: false },
};

/** Delivery options — labels only, no invented partner names. */
const DELIVERY = [
  {
    value: "standard",
    label: "Standard delivery",
    supporting: "Tracked, 2–3 working days",
    trailing: "Free",
    price: 0,
  },
  {
    value: "express",
    label: "Express delivery",
    supporting: "Tracked, next working day",
    trailing: "AED 35",
    price: 35_00,
  },
  {
    value: "collect",
    label: "Collect in Dubai",
    supporting: "Ready in 24 hours at the workshop",
    trailing: "Free",
    price: 0,
  },
];

/** Payment methods — categories only, no third-party brand marks. */
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
  const lines = getCheckoutBag();
  const totals = totalsFor(lines);

  return (
    <>
      <CheckoutHeader />
      <div className="flex-1">
        <CheckoutView
          lines={lines}
          totals={totals}
          delivery={DELIVERY}
          payment={PAYMENT}
        />
      </div>
      <TrustFooter />
    </>
  );
}
