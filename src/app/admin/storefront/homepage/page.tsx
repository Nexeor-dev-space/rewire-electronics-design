import type { Metadata } from "next";
import { AdminEmptyState, AdminPage } from "@/components/admin/admin-page";
import { HomepageBuilder } from "@/components/admin/homepage/homepage-builder";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Homepage Builder" };

export default async function HomepageBuilderPage() {
  const session = await getSession();
  if (!session) return null;

  if (!hasPermission(session.user.permissions, PERMISSIONS.homepage)) {
    return (
      <AdminPage title="Homepage Builder">
        <AdminEmptyState
          title="Access denied"
          description="Your role doesn't include the Homepage Builder."
        />
      </AdminPage>
    );
  }

  return <HomepageBuilder />;
}
