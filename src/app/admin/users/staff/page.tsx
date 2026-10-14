import type { Metadata } from "next";
import { AdminEmptyState, AdminPage } from "@/components/admin/admin-page";
import { UserManagement } from "@/components/admin/users/user-management";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Staff" };

export default async function StaffPage() {
  const session = await getSession();
  if (!session) return null;

  if (!hasPermission(session.user.permissions, PERMISSIONS.staffAccounts)) {
    return (
      <AdminPage title="Staff">
        <AdminEmptyState title="Access denied" description="Only Admins manage staff accounts." />
      </AdminPage>
    );
  }

  return <UserManagement viewer={session.user} group="staff" />;
}
