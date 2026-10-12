import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminEmptyState, AdminPage } from "@/components/admin/admin-page";
import { ReturnManagement } from "@/components/admin/returns/return-management";
import { SIGN_IN_PAGE_PATH } from "@/lib/constants";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Returns" };

export default async function ReturnsPage() {
  const session = await getSession();
  if (!session) redirect(SIGN_IN_PAGE_PATH);

  if (!hasPermission(session.user.permissions, PERMISSIONS.returns)) {
    return (
      <AdminPage title="Returns">
        <AdminEmptyState title="Access denied" description="Your role doesn't include Returns." />
      </AdminPage>
    );
  }

  return <ReturnManagement />;
}
