import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminEmptyState, AdminPage } from "@/components/admin/admin-page";
import { ProductManagement } from "@/components/admin/products/product-management";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Products" };

export default async function ProductsPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  if (!hasPermission(session.user.role, PERMISSIONS.products)) {
    return (
      <AdminPage title="Products">
        <AdminEmptyState title="Access denied" description="Your role doesn't include Products." />
      </AdminPage>
    );
  }

  return <ProductManagement />;
}
