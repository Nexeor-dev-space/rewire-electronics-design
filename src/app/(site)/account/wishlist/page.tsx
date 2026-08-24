import type { Metadata } from "next";
import { AccountWishlist } from "@/components/account/account-wishlist";
import { AccountGated } from "@/components/account/account-auth-gate";

export const metadata: Metadata = { title: "Wishlist" };

export default function WishlistPage() {
  return (
    <AccountGated>
      <AccountWishlist />
    </AccountGated>
  );
}
