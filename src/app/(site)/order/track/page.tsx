import { Suspense } from "react";
import type { Metadata } from "next";
import { TrackOrder } from "@/components/order/track-order";

export const metadata: Metadata = {
  title: "Track your order",
  description: "Enter your order number and email to see where your Rewire order is.",
  robots: { index: false, follow: false },
};

export default function TrackOrderPage() {
  return (
    <Suspense fallback={null}>
      <TrackOrder />
    </Suspense>
  );
}
