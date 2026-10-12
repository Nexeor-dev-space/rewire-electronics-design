import type { Metadata } from "next";
import { AccountOrderDetail } from "@/components/account/account-order-detail";

interface Params {
  params: Promise<{ number: string }>;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { number } = await params;
  return { title: `Order ${number.toUpperCase()}` };
}

export default async function OrderDetailPage({ params }: Params) {
  const { number } = await params;
  return <AccountOrderDetail number={number} />;
}
