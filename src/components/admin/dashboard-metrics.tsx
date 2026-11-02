"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardMetrics } from "@/hooks/use-dashboard";
import { adminMetrics, METRIC_PLACEHOLDER, type AdminMetric } from "@/lib/admin-console";
import type { DashboardMetrics as Metrics } from "@/types/dashboard";

const NO_ACCESS_HINT = "No access";
const NO_LIVE_RELEASE = "No live release";

function figureFor(key: AdminMetric["key"], data: Metrics): { value: string; hint?: string } {
  if (key === "live-release") return { value: METRIC_PLACEHOLDER, hint: NO_LIVE_RELEASE };
  const counts: Record<string, number | null> = {
    "orders-today": data.ordersToday,
    "open-claims": data.openClaims,
    "low-stock": data.lowStock,
  };
  const count = counts[key];
  return count == null ? { value: METRIC_PLACEHOLDER, hint: NO_ACCESS_HINT } : { value: String(count) };
}

export function DashboardMetrics() {
  const metrics = useDashboardMetrics();

  return (
    <>
      {metrics.isError && (
        <div role="alert" className="mb-4 flex items-center justify-between gap-4 text-sm text-ink-secondary">
          <p>Couldn&apos;t load the figures. {metrics.error.message}</p>
          <Button variant="outline" size="sm" onClick={() => metrics.refetch()}>
            Try again
          </Button>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {adminMetrics.map((metric) => {
          const figure = metrics.data ? figureFor(metric.key, metrics.data) : { value: METRIC_PLACEHOLDER };
          return (
            <Card key={metric.key} padding="md" className="flex flex-col gap-1">
              <p className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink-muted">
                {metric.label}
              </p>
              {metrics.isPending ? (
                <Skeleton className="my-2 h-8 w-16" />
              ) : (
                <p className="text-[2rem] font-light leading-tight tracking-[-0.02em] text-ink">{figure.value}</p>
              )}
              <p className="text-xs text-ink-secondary">{figure.hint ?? metric.hint}</p>
              <Link
                href={metric.href}
                className="mt-3 text-xs text-ink-muted underline-offset-4 transition-colors duration-(--duration-fast) hover:text-ink hover:underline"
              >
                Open module
              </Link>
            </Card>
          );
        })}
      </div>
    </>
  );
}
