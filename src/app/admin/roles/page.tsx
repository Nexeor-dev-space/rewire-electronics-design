import type { Metadata } from "next";
import { AdminEmptyState, AdminPage } from "@/components/admin/admin-page";
import { RolePermissions } from "@/components/admin/roles/role-permissions";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Roles" };

export default async function RolesPage() {
  const session = await getSession();
  if (!session) return null;

  if (!hasPermission(session.user.permissions, PERMISSIONS.roles)) {
    return (
      <AdminPage title="Roles">
        <AdminEmptyState title="Access denied" description="Only Admins manage roles." />
      </AdminPage>
    );
  }

  return <RolePermissions />;
}
