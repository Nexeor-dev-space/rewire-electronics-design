import type { Metadata } from "next";
import { AdminEmptyState, AdminPage } from "@/components/admin/admin-page";
import { BrandManagement } from "@/components/admin/brands/brand-management";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Brands" };

export default async function BrandsPage() {
  const session = await getSession();
  if (!session) return null;

  if (!hasPermission(session.user.permissions, PERMISSIONS.brands)) {
    return (
      <AdminPage title="Brands">
        <AdminEmptyState title="Access denied" description="Your role doesn't include Brands." />
      </AdminPage>
    );
  }

  return <BrandManagement />;
}
