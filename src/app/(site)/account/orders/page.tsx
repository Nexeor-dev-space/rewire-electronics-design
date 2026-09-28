import type { Metadata } from "next";
import { AccountOrders } from "@/components/account/account-orders";

export const metadata: Metadata = { title: "My orders" };

export default function OrdersPage() {
  return <AccountOrders />;
}
