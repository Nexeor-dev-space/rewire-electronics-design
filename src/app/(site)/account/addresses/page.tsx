import type { Metadata } from "next";
import { AccountAddresses } from "@/components/account/account-addresses";

export const metadata: Metadata = { title: "Saved addresses" };

export default function AddressesPage() {
  return <AccountAddresses />;
}
