import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminEmptyState, AdminPage } from "@/components/admin/admin-page";
import { IntegrationSettings } from "@/components/admin/integrations/integration-settings";
import { SIGN_IN_PAGE_PATH } from "@/lib/constants";
import { PERMISSIONS, canManageIntegrations, hasPermission } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "API Credentials" };

export default async function IntegrationsPage() {
  const session = await getSession();
  if (!session) redirect(SIGN_IN_PAGE_PATH);

  const allowed =
    hasPermission(session.user.role, PERMISSIONS.integrations) &&
    canManageIntegrations(session.user.role);

  if (!allowed) {
    return (
      <AdminPage title="API Credentials">
        <AdminEmptyState title="Access denied" description="Only Admins can manage integrations." />
      </AdminPage>
    );
  }

  return <IntegrationSettings />;
}
