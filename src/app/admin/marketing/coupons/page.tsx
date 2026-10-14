import type { Metadata } from "next";
import { AdminEmptyState, AdminPage } from "@/components/admin/admin-page";
import { CouponManagement } from "@/components/admin/coupons/coupon-management";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Discount Codes" };

export default async function CouponsPage() {
  const session = await getSession();
  if (!session) return null;

  if (!hasPermission(session.user.permissions, PERMISSIONS.coupons)) {
    return (
      <AdminPage title="Discount Codes">
        <AdminEmptyState title="Access denied" description="Your role doesn't include Discount Codes." />
      </AdminPage>
    );
  }

  return <CouponManagement />;
}
