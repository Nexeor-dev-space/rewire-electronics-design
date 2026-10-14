import type { Metadata } from "next";
import { AdminEmptyState, AdminPage } from "@/components/admin/admin-page";
import { UserManagement } from "@/components/admin/users/user-management";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Customers" };

export default async function CustomersPage() {
  const session = await getSession();
  if (!session) return null;

  if (!hasPermission(session.user.permissions, PERMISSIONS.customers)) {
    return (
      <AdminPage title="Customers">
        <AdminEmptyState title="Access denied" description="Your role doesn't include Customers." />
      </AdminPage>
    );
  }

  return <UserManagement viewer={session.user} group="customers" />;
}
