import type { Metadata } from "next";
import { AdminEmptyState, AdminPage } from "@/components/admin/admin-page";
import { TrashUsers } from "@/components/admin/trash/trash-users";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Deleted Users" };

export default async function TrashUsersPage() {
  const session = await getSession();
  if (!session) return null;

  if (!hasPermission(session.user.permissions, PERMISSIONS.trash)) {
    return (
      <AdminPage title="Deleted Users">
        <AdminEmptyState title="Access denied" description="Your role doesn't include Trash." />
      </AdminPage>
    );
  }

  return <TrashUsers viewer={session.user} />;
}
