import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminEmptyState, AdminPage } from "@/components/admin/admin-page";
import { DeliveryZoneManagement } from "@/components/admin/delivery-zones/delivery-zone-management";
import { SIGN_IN_PAGE_PATH } from "@/lib/constants";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Delivery Zones" };

export default async function DeliveryZonesPage() {
  const session = await getSession();
  if (!session) redirect(SIGN_IN_PAGE_PATH);

  if (!hasPermission(session.user.permissions, PERMISSIONS.deliveryZones)) {
    return (
      <AdminPage title="Delivery Zones">
        <AdminEmptyState title="Access denied" description="Your role doesn't include Delivery Zones." />
      </AdminPage>
    );
  }

  return <DeliveryZoneManagement />;
}
