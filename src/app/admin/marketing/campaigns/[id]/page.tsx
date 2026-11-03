import type { Metadata } from "next";
import { AdminEmptyState, AdminPage } from "@/components/admin/admin-page";
import { CampaignDetail } from "@/components/admin/campaigns/campaign-detail";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = { title: "Campaign — Campaigns" };

export default async function CampaignDetailPage({ params }: Props) {
  const session = await getSession();
  if (!session) return null;

  if (!hasPermission(session.user.permissions, PERMISSIONS.campaigns)) {
    return (
      <AdminPage title="Campaign">
        <AdminEmptyState title="Access denied" description="Your role doesn't include Campaigns." />
      </AdminPage>
    );
  }

  const { id } = await params;
  return <CampaignDetail id={id} />;
}
