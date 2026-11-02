import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminEmptyState, AdminPage } from "@/components/admin/admin-page";
import { ReportDashboard } from "@/components/admin/reports/report-dashboard";
import { SIGN_IN_PAGE_PATH } from "@/lib/constants";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Reports" };

export default async function ReportsPage() {
  const session = await getSession();
  if (!session) redirect(SIGN_IN_PAGE_PATH);

  if (!hasPermission(session.user.permissions, PERMISSIONS.reports)) {
    return (
      <AdminPage title="Reports">
        <AdminEmptyState title="Access denied" description="Your role doesn't include Reports." />
      </AdminPage>
    );
  }

  return <ReportDashboard />;
}
