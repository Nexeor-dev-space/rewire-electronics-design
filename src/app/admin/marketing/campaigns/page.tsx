import type { Metadata } from "next";
import { AdminEmptyState, AdminPage } from "@/components/admin/admin-page";
import { CampaignManagement } from "@/components/admin/campaigns/campaign-management";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Campaigns" };

export default async function CampaignsPage() {
  const session = await getSession();
  if (!session) return null;

  if (!hasPermission(session.user.permissions, PERMISSIONS.campaigns)) {
    return (
      <AdminPage title="Campaigns">
        <AdminEmptyState title="Access denied" description="Your role doesn't include Campaigns." />
      </AdminPage>
    );
  }

  return <CampaignManagement />;
}
