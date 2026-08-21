import type { Metadata } from "next";
import { CheckoutHeader } from "@/components/checkout/checkout-header";
import { TrustFooter } from "@/components/checkout/trust-footer";
import { OrderSuccess } from "@/components/checkout/order-success";

export const metadata: Metadata = {
  title: "Order Confirmed",
  description: "Your Rewire order is placed.",
  robots: { index: false, follow: false },
};

export default function CheckoutSuccessPage() {
  return (
    <>
      <CheckoutHeader />
      <div className="flex-1">
        <OrderSuccess />
      </div>
      <TrustFooter />
    </>
  );
}
