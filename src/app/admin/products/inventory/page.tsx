import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminEmptyState, AdminPage } from "@/components/admin/admin-page";
import { InventoryManagement } from "@/components/admin/inventory/inventory-management";
import { SIGN_IN_PAGE_PATH } from "@/lib/constants";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Inventory" };

export default async function InventoryPage() {
  const session = await getSession();
  if (!session) redirect(SIGN_IN_PAGE_PATH);

  if (!hasPermission(session.user.permissions, PERMISSIONS.inventory)) {
    return (
      <AdminPage title="Inventory">
        <AdminEmptyState title="Access denied" description="Your role doesn't include Inventory." />
      </AdminPage>
    );
  }

  return <InventoryManagement />;
}
