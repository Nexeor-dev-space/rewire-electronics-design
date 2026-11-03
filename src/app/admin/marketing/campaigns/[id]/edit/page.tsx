import type { Metadata } from "next";
import { AdminEmptyState, AdminPage } from "@/components/admin/admin-page";
import { CampaignEdit } from "@/components/admin/campaigns/campaign-form";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = { title: "Edit campaign — Campaigns" };

export default async function EditCampaignPage({ params }: Props) {
  const session = await getSession();
  if (!session) return null;

  if (!hasPermission(session.user.permissions, PERMISSIONS.campaigns, "EDIT")) {
    return (
      <AdminPage title="Edit campaign">
        <AdminEmptyState title="Access denied" description="Your role can view campaigns but not change them." />
      </AdminPage>
    );
  }

  const { id } = await params;
  return <CampaignEdit id={id} />;
}
