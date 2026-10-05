import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminEmptyState, AdminPage } from "@/components/admin/admin-page";
import { RolePermissions } from "@/components/admin/roles/role-permissions";
import { SIGN_IN_PAGE_PATH } from "@/lib/constants";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Roles" };

export default async function RolesPage() {
  const session = await getSession();
  if (!session) redirect(SIGN_IN_PAGE_PATH);

  if (!hasPermission(session.user.permissions, PERMISSIONS.roles)) {
    return (
      <AdminPage title="Roles">
        <AdminEmptyState title="Access denied" description="Only Admins manage roles." />
      </AdminPage>
    );
  }

  return <RolePermissions />;
}
