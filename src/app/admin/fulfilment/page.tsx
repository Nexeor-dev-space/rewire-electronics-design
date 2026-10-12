import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminEmptyState, AdminPage } from "@/components/admin/admin-page";
import { FulfilmentQueue } from "@/components/admin/fulfilment/fulfilment-queue";
import { SIGN_IN_PAGE_PATH } from "@/lib/constants";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Fulfilment" };

export default async function FulfilmentPage() {
  const session = await getSession();
  if (!session) redirect(SIGN_IN_PAGE_PATH);

  if (!hasPermission(session.user.permissions, PERMISSIONS.fulfilment)) {
    return (
      <AdminPage title="Fulfilment">
        <AdminEmptyState title="Access denied" description="Your role doesn't include Fulfilment." />
      </AdminPage>
    );
  }

  return <FulfilmentQueue />;
}
