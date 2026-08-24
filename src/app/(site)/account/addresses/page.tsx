import type { Metadata } from "next";
import { AccountAddresses } from "@/components/account/account-addresses";
import { AccountGated } from "@/components/account/account-auth-gate";

export const metadata: Metadata = { title: "Saved addresses" };

export default function AddressesPage() {
  return (
    <AccountGated>
      <AccountAddresses />
    </AccountGated>
  );
}
