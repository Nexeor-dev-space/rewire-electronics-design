import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminEmptyState, AdminPage } from "@/components/admin/admin-page";
import { AddOnManagement } from "@/components/admin/add-ons/add-on-management";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Add-ons" };

export default async function AddOnsPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  if (!hasPermission(session.user.role, PERMISSIONS.addOns)) {
    return (
      <AdminPage title="Add-ons">
        <AdminEmptyState title="Access denied" description="Your role doesn't include Add-ons." />
      </AdminPage>
    );
  }

  return <AddOnManagement />;
}
