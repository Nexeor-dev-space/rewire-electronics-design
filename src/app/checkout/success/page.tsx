import type { Metadata } from "next";
import { CheckoutHeader } from "@/components/checkout/checkout-header";
import { TrustFooter } from "@/components/checkout/trust-footer";
import { OrderSuccess } from "@/components/checkout/order-success";
import { CHECKOUT_SESSION_ID_PARAM, PAYMENT_CANCELLED_VALUE, PAYMENT_RESULT_PARAM } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Order Confirmed",
  description: "Your Rewire order is placed.",
  robots: { index: false, follow: false },
};

type Param = string | string[] | undefined;

interface Props {
  searchParams: Promise<Record<string, Param>>;
}

function single(value: Param): string {
  return typeof value === "string" ? value.trim() : "";
}

export default async function CheckoutSuccessPage({ searchParams }: Props) {
  const params = await searchParams;
  const number = single(params.order).toUpperCase();
  const sessionId = single(params[CHECKOUT_SESSION_ID_PARAM]);
  const paymentCancelled = single(params[PAYMENT_RESULT_PARAM]) === PAYMENT_CANCELLED_VALUE;

  return (
    <>
      <CheckoutHeader />
      <div className="flex-1">
        <OrderSuccess number={number} sessionId={sessionId} paymentCancelled={paymentCancelled} />
      </div>
      <TrustFooter />
    </>
  );
}
