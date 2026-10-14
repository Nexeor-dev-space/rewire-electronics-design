import type { Metadata } from "next";
import { AdminEmptyState, AdminPage } from "@/components/admin/admin-page";
import { ChangeLog } from "@/components/admin/change-log/change-log";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Change Log" };

export default async function ChangeLogPage() {
  const session = await getSession();
  if (!session) return null;

  if (!hasPermission(session.user.permissions, PERMISSIONS.changeLog)) {
    return (
      <AdminPage title="Change Log">
        <AdminEmptyState title="Access denied" description="Your role doesn't include the Change Log." />
      </AdminPage>
    );
  }

  return <ChangeLog />;
}
