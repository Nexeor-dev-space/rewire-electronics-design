import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminEmptyState, AdminPage } from "@/components/admin/admin-page";
import { TrashUsers } from "@/components/admin/trash/trash-users";
import { SIGN_IN_PAGE_PATH } from "@/lib/constants";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Deleted Users" };

export default async function TrashUsersPage() {
  const session = await getSession();
  if (!session) redirect(SIGN_IN_PAGE_PATH);

  if (!hasPermission(session.user.permissions, PERMISSIONS.trash)) {
    return (
      <AdminPage title="Deleted Users">
        <AdminEmptyState title="Access denied" description="Your role doesn't include Trash." />
      </AdminPage>
    );
  }

  return <TrashUsers viewer={session.user} />;
}
