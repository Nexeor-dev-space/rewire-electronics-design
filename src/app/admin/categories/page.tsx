import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminEmptyState, AdminPage } from "@/components/admin/admin-page";
import { CategoryManagement } from "@/components/admin/categories/category-management";
import { SIGN_IN_PAGE_PATH } from "@/lib/constants";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Categories" };

export default async function CategoriesPage() {
  const session = await getSession();
  if (!session) redirect(SIGN_IN_PAGE_PATH);

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
