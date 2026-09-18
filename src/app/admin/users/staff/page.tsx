import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminEmptyState, AdminPage } from "@/components/admin/admin-page";
import { UserManagement } from "@/components/admin/users/user-management";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Staff" };

export default async function StaffPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  if (!hasPermission(session.user.role, PERMISSIONS.users)) {
    return (
      <AdminPage title="Staff">
        <AdminEmptyState title="Access denied" description="Your role doesn't include Users." />
      </AdminPage>
    );
  }

  return <UserManagement viewer={session.user} group="staff" />;
}
