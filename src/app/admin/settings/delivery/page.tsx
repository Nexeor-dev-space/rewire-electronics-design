import type { Metadata } from "next";
import { AdminEmptyState, AdminPage } from "@/components/admin/admin-page";
import { DeliveryZoneManagement } from "@/components/admin/delivery-zones/delivery-zone-management";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Delivery Zones" };

export default async function DeliveryZonesPage() {
  const session = await getSession();
  if (!session) return null;

  if (!hasPermission(session.user.permissions, PERMISSIONS.deliveryZones)) {
    return (
      <AdminPage title="Delivery Zones">
        <AdminEmptyState title="Access denied" description="Your role doesn't include Delivery Zones." />
      </AdminPage>
    );
  }

  return <DeliveryZoneManagement />;
}
