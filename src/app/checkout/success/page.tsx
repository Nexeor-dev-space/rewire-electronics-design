import type { Metadata } from "next";
import { CheckoutHeader } from "@/components/checkout/checkout-header";
import { TrustFooter } from "@/components/checkout/trust-footer";
import { OrderSuccess } from "@/components/checkout/order-success";

export const metadata: Metadata = {
  title: "Order Confirmed",
  description: "Your Rewire order is placed.",
  robots: { index: false, follow: false },
};

interface Props {
  searchParams: Promise<{ order?: string | string[] }>;
}

export default async function CheckoutSuccessPage({ searchParams }: Props) {
  const { order } = await searchParams;
  const number = typeof order === "string" ? order.trim().toUpperCase() : "";

  return (
    <>
      <CheckoutHeader />
      <div className="flex-1">
        <OrderSuccess number={number} />
      </div>
      <TrustFooter />
    </>
  );
}
