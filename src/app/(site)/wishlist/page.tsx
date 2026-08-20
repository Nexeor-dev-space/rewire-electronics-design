import type { Metadata } from "next";
import { WishlistView } from "@/components/wishlist/wishlist-view";

export const metadata: Metadata = {
  title: "Saved for Later",
  description:
    "The Rewire devices you have saved to come back to — with everything you need to move any of them into the cart.",
  robots: { index: false, follow: false },
};

export default function WishlistPage() {
  return <WishlistView />;
}
