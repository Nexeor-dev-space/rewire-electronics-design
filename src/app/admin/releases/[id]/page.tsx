import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminEmptyState, AdminPage } from "@/components/admin/admin-page";
import { ReleaseDetailScreen } from "@/components/admin/releases/release-detail";
import { SIGN_IN_PAGE_PATH } from "@/lib/constants";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = { title: "Release" };

export default async function ReleaseDetailPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect(SIGN_IN_PAGE_PATH);

  if (!hasPermission(session.user.permissions, PERMISSIONS.releases)) {
    return (
      <AdminPage title="Releases">
        <AdminEmptyState title="Access denied" description="Your role doesn't include Releases." />
      </AdminPage>
    );
  }

  const { id } = await params;
  return <ReleaseDetailScreen id={id} />;
}
