import type { Metadata } from "next";
import { AdminEmptyState, AdminPage } from "@/components/admin/admin-page";
import { ReleaseManagement } from "@/components/admin/releases/release-management";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Releases" };

export default async function ReleasesPage() {
  const session = await getSession();
  if (!session) return null;

  if (!hasPermission(session.user.permissions, PERMISSIONS.releases)) {
    return (
      <AdminPage title="Releases">
        <AdminEmptyState title="Access denied" description="Your role doesn't include Releases." />
      </AdminPage>
    );
  }

  return <ReleaseManagement />;
}
