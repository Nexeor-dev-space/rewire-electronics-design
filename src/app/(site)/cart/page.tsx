import type { Metadata } from "next";
import { CartView } from "@/components/cart/cart-view";

export const metadata: Metadata = {
  title: "Your Cart",
  description:
    "Review the certified devices in your Rewire cart before you check out.",
  robots: { index: false, follow: false },
};

export default function CartPage() {
  return <CartView />;
}
