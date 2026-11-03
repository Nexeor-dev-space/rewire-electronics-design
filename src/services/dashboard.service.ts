import "server-only";

import { PERMISSIONS, hasPermission, type PermissionGrid } from "@/lib/auth/permissions";
import { startOfStoreDay } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { getLiveRelease } from "@/services/release.service";
import { getLowStockThreshold } from "@/services/store-settings.service";
import { openClaimWhere } from "@/services/warranty.service";
import type { DashboardMetrics } from "@/types/dashboard";

function countOrdersToday(now: Date): Promise<number> {
  return prisma.order.count({ where: { createdAt: { gte: startOfStoreDay(now) } } });
}

function countOpenClaims(): Promise<number> {
  return prisma.warrantyClaim.count({ where: openClaimWhere });
}

async function countLowStock(): Promise<number> {
  const storeThreshold = await getLowStockThreshold();
  return prisma.productVariant.count({
    where: {
      product: { deletedAt: null, status: { not: "ARCHIVED" } },
      OR: [
        { lowStockThreshold: null, stock: { lt: storeThreshold } },
        { stock: { lt: prisma.productVariant.fields.lowStockThreshold } },
      ],
    },
  });
}

function ifAllowed<T>(allowed: boolean, load: () => Promise<T>): Promise<T | null> {
  return allowed ? load() : Promise.resolve(null);
}

export async function getDashboardMetrics(permissions: PermissionGrid, now = new Date()): Promise<DashboardMetrics> {
  const canViewReleases = hasPermission(permissions, PERMISSIONS.releases);
  const [ordersToday, openClaims, lowStock, liveRelease] = await Promise.all([
    ifAllowed(hasPermission(permissions, PERMISSIONS.orders), () => countOrdersToday(now)),
    ifAllowed(hasPermission(permissions, PERMISSIONS.warranty), countOpenClaims),
    ifAllowed(hasPermission(permissions, PERMISSIONS.products), countLowStock),
    ifAllowed(canViewReleases, () => getLiveRelease(now)),
  ]);
  return { ordersToday, openClaims, lowStock, liveRelease, canViewReleases };
}
