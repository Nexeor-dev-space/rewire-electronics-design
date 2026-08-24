import type { Metadata } from "next";
import { AccountOverview } from "@/components/account/account-overview";
import { AccountGated } from "@/components/account/account-auth-gate";

export const metadata: Metadata = {
  title: "Your account",
  description:
    "Orders, returns, wishlist and saved addresses — everything you own on Rewire in one place.",
};

export default function AccountPage() {
  return (
    <AccountGated>
      <AccountOverview />
    </AccountGated>
  );
}
