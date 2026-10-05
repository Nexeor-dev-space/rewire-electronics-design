import "server-only";

import {
  STAFF_MODULES,
  fullGrid,
  normaliseActions,
  type PermissionGrid,
  type Role,
} from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";

/**
 * What each role may do in the console.
 *
 * ADMIN holds every action and CUSTOMER none; both are fixed in code. STAFF
 * is configured on the Roles screen and stored in `role_permissions`, one row
 * per module. Until an Admin first saves the grid there are no Staff rows,
 * and Staff keep full access, which is how they worked before this existed.
 * The first save writes a row for every module, so from then on a missing
 * row (a module added later) means no access.
 *
 * The Staff grid is read on every admin request, so it is cached in process
 * memory and dropped on save. Single instance only, like the rate limits.
 */

const globalForRoles = globalThis as unknown as {
  staffGrid?: Promise<PermissionGrid>;
};

async function loadStaffGrid(): Promise<PermissionGrid> {
  const rows = await prisma.rolePermission.findMany({
    where: { role: "STAFF" },
    select: { module: true, actions: true },
  });
  if (rows.length === 0) return fullGrid(STAFF_MODULES);

  const stored = new Map(rows.map((row) => [row.module, row.actions]));
  return Object.fromEntries(
    STAFF_MODULES.map((module) => [module.key, normaliseActions(module, stored.get(module.key) ?? [])]),
  );
}

export function getStaffPermissions(): Promise<PermissionGrid> {
  const cached = globalForRoles.staffGrid;
  if (cached) return cached;

  const pending = loadStaffGrid().catch((error: unknown) => {
    if (globalForRoles.staffGrid === pending) globalForRoles.staffGrid = undefined;
    throw error;
  });
  globalForRoles.staffGrid = pending;
  return pending;
}

export async function getRolePermissions(role: Role): Promise<PermissionGrid> {
  if (role === "ADMIN") return fullGrid();
  if (role === "STAFF") return getStaffPermissions();
  return {};
}

/**
 * Replaces the whole Staff grid. Every Staff module gets a row, an empty one
 * when nothing is granted, so the "never configured" fallback ends here.
 * Unknown module keys are ignored; actions are normalised per module.
 */
export async function saveStaffPermissions(grid: PermissionGrid, actorId: string): Promise<PermissionGrid> {
  const rows = STAFF_MODULES.map((module) => ({
    role: "STAFF" as const,
    module: module.key,
    actions: normaliseActions(module, grid[module.key] ?? []),
    updatedById: actorId,
  }));

  await prisma.$transaction([
    prisma.rolePermission.deleteMany({ where: { role: "STAFF" } }),
    prisma.rolePermission.createMany({ data: rows }),
  ]);

  globalForRoles.staffGrid = undefined;
  return getStaffPermissions();
}
