import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getOrderById, getOrders } from "@/lib/account-data";
import { AccountOrderDetail } from "@/components/account/account-order-detail";
import { AccountGated } from "@/components/account/account-auth-gate";

interface Params {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  return getOrders().map((order) => ({ id: order.id }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const order = getOrderById(id);
  if (!order) return { title: "Order not found" };
  return { title: `Order ${order.number}` };
}

export default async function OrderDetailPage({ params }: Params) {
  const { id } = await params;
  const order = getOrderById(id);
  if (!order) notFound();
  return (
    <AccountGated>
      <AccountOrderDetail order={order} />
    </AccountGated>
  );
}
