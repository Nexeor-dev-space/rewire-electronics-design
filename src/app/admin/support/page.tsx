import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminEmptyState, AdminPage } from "@/components/admin/admin-page";
import { SupportManagement } from "@/components/admin/support/support-management";
import { SIGN_IN_PAGE_PATH } from "@/lib/constants";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Support Tickets" };

export default async function SupportTicketsPage() {
  const session = await getSession();
  if (!session) redirect(SIGN_IN_PAGE_PATH);

  if (!hasPermission(session.user.permissions, PERMISSIONS.support)) {
    return (
      <AdminPage title="Support Tickets">
        <AdminEmptyState title="Access denied" description="Your role doesn't include Support Tickets." />
      </AdminPage>
    );
  }

  return <SupportManagement />;
}
