import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { AdminPage, AdminEmptyState } from "@/components/admin/admin-page";
import { adminMetrics, METRIC_PLACEHOLDER } from "@/lib/admin-console";
import { adminNav, ADMIN_ROOT, matchAdminRoute } from "@/lib/admin-nav";

/**
 * Admin dashboard — the console's landing page.
 *
 * Four operational indicators and nothing else: no reporting, no
 * analytics, no charts. Each tile carries a placeholder figure until the
 * API behind it exists, so the screen can never show a number it did not
 * actually count.
 */

const dashboard = matchAdminRoute(ADMIN_ROOT)?.item;

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function AdminDashboardPage() {
  return (
    <AdminPage title="Dashboard" description={dashboard?.description}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {adminMetrics.map((metric) => (
          <Card key={metric.key} padding="md" className="flex flex-col gap-1">
            <p className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink-muted">
              {metric.label}
            </p>
            <p className="text-[2rem] font-light leading-tight tracking-[-0.02em] text-ink">
              {METRIC_PLACEHOLDER}
            </p>
            <p className="text-xs text-ink-secondary">{metric.hint}</p>
            <Link
              href={metric.href}
              className="mt-3 text-xs text-ink-muted underline-offset-4 transition-colors duration-(--duration-fast) hover:text-ink hover:underline"
            >
              Open module
            </Link>
          </Card>
        ))}
      </div>

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

      <div className="mt-10">
        <AdminEmptyState
          title="Live figures are not connected yet"
          description="The dashboard shows the structure only. Each tile starts reporting when its module and API land."
        />
      </div>
    </AdminPage>
  );
}
