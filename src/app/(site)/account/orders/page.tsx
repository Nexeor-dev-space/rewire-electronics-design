import type { Metadata } from "next";
import { AccountOrders } from "@/components/account/account-orders";
import { AccountGated } from "@/components/account/account-auth-gate";

export const metadata: Metadata = { title: "My orders" };

export default function OrdersPage() {
  return (
    <AccountGated>
      <AccountOrders />
    </AccountGated>
  );
}
