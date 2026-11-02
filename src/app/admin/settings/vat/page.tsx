import type { Metadata } from "next";
import { AdminEmptyState, AdminPage } from "@/components/admin/admin-page";
import { VatConfiguration } from "@/components/admin/vat/vat-configuration";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "VAT & Configuration" };

export default async function VatConfigurationPage() {
  const session = await getSession();
  if (!session) return null;

  if (!hasPermission(session.user.permissions, PERMISSIONS.vat)) {
    return (
      <AdminPage title="VAT & Configuration">
        <AdminEmptyState title="Access denied" description="Your role doesn't include VAT & Configuration." />
      </AdminPage>
    );
  }

  return <VatConfiguration />;
}
