import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { AdminPage } from "@/components/admin/admin-page";
import { DashboardMetrics } from "@/components/admin/dashboard-metrics";
import { adminNav, ADMIN_ROOT, matchAdminRoute } from "@/lib/admin-nav";

/**
 * Admin dashboard — the console's landing page.
 *
 * Four operational indicators and nothing else: no reporting, no
 * analytics, no charts. Each figure is counted from live records, and
 * reads as a placeholder when the viewer cannot open its module.
 */

const dashboard = matchAdminRoute(ADMIN_ROOT)?.item;

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function AdminDashboardPage() {
  return (
    <AdminPage title="Dashboard" description={dashboard?.description}>
      <DashboardMetrics />

      <section className="mt-10">
        <h2 className="mb-4 font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink-muted">
          Areas
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {adminNav
            .filter((section) => section.area !== "overview")
            .map((section) => (
              <Card
                key={section.area}
                padding="md"
                variant="plain"
                className="border border-line"
              >
                <p className="text-sm font-medium text-ink">{section.label}</p>
                <p className="mt-1 text-xs text-ink-muted">
                  {section.items.length} modules
                </p>
              </Card>
            ))}
        </div>
      </section>
    </AdminPage>
  );
}
