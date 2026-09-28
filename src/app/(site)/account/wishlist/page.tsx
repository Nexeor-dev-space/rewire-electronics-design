import type { Metadata } from "next";
import { AccountWishlist } from "@/components/account/account-wishlist";

export const metadata: Metadata = { title: "Wishlist" };

export default function WishlistPage() {
  return <AccountWishlist />;
}
