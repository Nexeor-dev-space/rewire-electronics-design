import type { Metadata } from "next";
import { AdminEmptyState, AdminPage } from "@/components/admin/admin-page";
import { CategoryManagement } from "@/components/admin/categories/category-management";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Categories" };

export default async function CategoriesPage() {
  const session = await getSession();
  if (!session) return null;

  if (!hasPermission(session.user.permissions, PERMISSIONS.categories)) {
    return (
      <AdminPage title="Categories">
        <AdminEmptyState
          title="Access denied"
          description="Your role doesn't include Categories."
        />
      </AdminPage>
    );
  }

  return <CategoryManagement />;
}
