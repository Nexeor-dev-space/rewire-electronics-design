import type { Metadata } from "next";
import { AdminEmptyState, AdminPage } from "@/components/admin/admin-page";
import { NavigationEditor } from "@/components/admin/navigation/navigation-editor";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Navigation" };

export default async function NavigationPage() {
  const session = await getSession();
  if (!session) return null;

  if (!hasPermission(session.user.permissions, PERMISSIONS.navigation)) {
    return (
      <AdminPage title="Navigation">
        <AdminEmptyState title="Access denied" description="Your role doesn't include Navigation." />
      </AdminPage>
    );
  }

  return <NavigationEditor />;
}
