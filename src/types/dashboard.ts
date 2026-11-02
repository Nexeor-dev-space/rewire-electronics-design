import type { LiveRelease } from "./release";

export interface DashboardMetrics {
  ordersToday: number | null;
  openClaims: number | null;
  lowStock: number | null;
  liveRelease: LiveRelease | null;
  canViewReleases: boolean;
}
