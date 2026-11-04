import type { Metadata } from "next";
import { AdminEmptyState, AdminPage } from "@/components/admin/admin-page";
import { ProductImportScreen } from "@/components/admin/product-import/product-import-screen";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Bulk Product Upload" };

export default async function UploadProductsPage() {
  const session = await getSession();
  if (!session) return null;

  if (!hasPermission(session.user.permissions, PERMISSIONS.bulkUpload)) {
    return (
      <AdminPage title="Bulk Product Upload">
        <AdminEmptyState title="Access denied" description="Your role doesn't include Bulk Product Upload." />
      </AdminPage>
    );
  }

  return <ProductImportScreen />;
}
