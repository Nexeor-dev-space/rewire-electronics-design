import type { Metadata } from "next";
import { AdminEmptyState, AdminPage } from "@/components/admin/admin-page";
import { AddOnManagement } from "@/components/admin/add-ons/add-on-management";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Add-ons" };

export default async function AddOnsPage() {
  const session = await getSession();
  if (!session) return null;

  if (!hasPermission(session.user.permissions, PERMISSIONS.addOns)) {
    return (
      <AdminPage title="Add-ons">
        <AdminEmptyState title="Access denied" description="Your role doesn't include Add-ons." />
      </AdminPage>
    );
  }

  return <AddOnManagement />;
}
