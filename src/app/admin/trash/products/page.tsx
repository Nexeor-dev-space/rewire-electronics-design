import type { Metadata } from "next";
import { AdminEmptyState, AdminPage } from "@/components/admin/admin-page";
import { TrashProducts } from "@/components/admin/trash/trash-products";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Deleted Products" };

export default async function TrashProductsPage() {
  const session = await getSession();
  if (!session) return null;

  if (!hasPermission(session.user.permissions, PERMISSIONS.trash)) {
    return (
      <AdminPage title="Deleted Products">
        <AdminEmptyState title="Access denied" description="Your role doesn't include Trash." />
      </AdminPage>
    );
  }

  return <TrashProducts />;
}
