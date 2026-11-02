import "server-only";

import { PERMISSIONS, hasPermission, type PermissionGrid } from "@/lib/auth/permissions";
import { startOfStoreDay } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { getStoreSettings } from "@/services/store-settings.service";
import { openClaimWhere } from "@/services/warranty.service";
import type { DashboardMetrics } from "@/types/dashboard";

function countOrdersToday(now: Date): Promise<number> {
  return prisma.order.count({
    where: { createdAt: { gte: startOfStoreDay(now) }, status: { not: "PENDING_PAYMENT" } },
  });
}

function countOpenClaims(): Promise<number> {
  return prisma.warrantyClaim.count({ where: openClaimWhere });
}

async function countLowStock(): Promise<number> {
  const { lowStockThreshold } = await getStoreSettings();
  return prisma.productVariant.count({
    where: { stock: { lt: lowStockThreshold }, product: { deletedAt: null } },
  });
}

function ifAllowed(allowed: boolean, count: () => Promise<number>): Promise<number | null> {
  return allowed ? count() : Promise.resolve(null);
}

export async function getDashboardMetrics(permissions: PermissionGrid, now = new Date()): Promise<DashboardMetrics> {
  const [ordersToday, openClaims, lowStock] = await Promise.all([
    ifAllowed(hasPermission(permissions, PERMISSIONS.orders), () => countOrdersToday(now)),
    ifAllowed(hasPermission(permissions, PERMISSIONS.warranty), countOpenClaims),
    ifAllowed(hasPermission(permissions, PERMISSIONS.products), countLowStock),
  ]);
  return { ordersToday, openClaims, lowStock, liveRelease: null };
}
