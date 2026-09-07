import Link from "next/link";
import { ADMIN_ROOT } from "@/lib/admin-nav";
import { AdminPage } from "@/components/admin/admin-page";

/**
 * Admin 404 — rendered inside the admin layout, so an operator who
 * mistypes a path keeps the navigation and can carry on from where they
 * are instead of being dropped onto the storefront's error page.
 */
export default function AdminNotFound() {
  return (
    <AdminPage
      title="Page not found"
      description="No admin module owns this route."
    >
      <Link
        href={ADMIN_ROOT}
        className="text-sm text-ink underline underline-offset-4"
      >
        Back to the dashboard
      </Link>
    </AdminPage>
  );
}
