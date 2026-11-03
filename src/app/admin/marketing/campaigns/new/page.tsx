import type { Metadata } from "next";
import { AdminEmptyState, AdminPage } from "@/components/admin/admin-page";
import { CampaignFormPage } from "@/components/admin/campaigns/campaign-form";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "New campaign — Campaigns" };

export default async function NewCampaignPage() {
  const session = await getSession();
  if (!session) return null;

  if (!hasPermission(session.user.permissions, PERMISSIONS.campaigns, "CREATE")) {
    return (
      <AdminPage title="New campaign">
        <AdminEmptyState title="Access denied" description="Your role can't create campaigns." />
      </AdminPage>
    );
  }

  return <CampaignFormPage />;
}
