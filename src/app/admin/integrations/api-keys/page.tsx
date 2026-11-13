import type { Metadata } from "next";
import { AdminEmptyState, AdminPage } from "@/components/admin/admin-page";
import { IntegrationsScreen } from "@/components/admin/integrations/integrations-screen";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "API Keys" };

export default async function ApiKeysPage() {
  const session = await getSession();
  if (!session) return null;

  if (!hasPermission(session.user.permissions, PERMISSIONS.integrations)) {
    return (
      <AdminPage title="API Keys">
        <AdminEmptyState title="Access denied" description="Your role doesn't include Integrations, API Keys." />
      </AdminPage>
    );
  }

  return <IntegrationsScreen />;
}
