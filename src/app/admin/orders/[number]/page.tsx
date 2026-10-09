import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminEmptyState, AdminPage } from "@/components/admin/admin-page";
import { OrderDetailScreen } from "@/components/admin/orders/order-detail";
import { SIGN_IN_PAGE_PATH } from "@/lib/constants";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";

interface Props {
  params: Promise<{ number: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { number } = await params;
  return { title: `Order ${number}` };
}

export default async function OrderDetailPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect(SIGN_IN_PAGE_PATH);

  if (!hasPermission(session.user.permissions, PERMISSIONS.orders)) {
    return (
      <AdminPage title="Orders">
        <AdminEmptyState title="Access denied" description="Your role doesn't include Orders." />
      </AdminPage>
    );
  }

  const { number } = await params;
  return <OrderDetailScreen number={number} />;
}
