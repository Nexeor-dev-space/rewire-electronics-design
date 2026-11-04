import type { Metadata } from "next";
import { AdminEmptyState, AdminPage } from "@/components/admin/admin-page";
import { ProductImportHistory } from "@/components/admin/product-import/product-import-history";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Import history" };

export default async function UploadHistoryPage() {
  const session = await getSession();
  if (!session) return null;

  if (!hasPermission(session.user.permissions, PERMISSIONS.bulkUpload)) {
    return (
      <AdminPage title="Import history">
        <AdminEmptyState title="Access denied" description="Your role doesn't include Bulk Product Upload." />
      </AdminPage>
    );
  }

  return <ProductImportHistory />;
}
