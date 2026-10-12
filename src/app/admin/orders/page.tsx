import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminEmptyState, AdminPage } from "@/components/admin/admin-page";
import { OrderManagement } from "@/components/admin/orders/order-management";
import { SIGN_IN_PAGE_PATH } from "@/lib/constants";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Orders" };

export default async function OrdersPage() {
  const session = await getSession();
  if (!session) redirect(SIGN_IN_PAGE_PATH);

  if (!hasPermission(session.user.permissions, PERMISSIONS.orders)) {
    return (
      <AdminPage title="Orders">
        <AdminEmptyState title="Access denied" description="Your role doesn't include Orders." />
      </AdminPage>
    );
  }

  return <OrderManagement />;
}
