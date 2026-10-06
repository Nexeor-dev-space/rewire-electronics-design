import "server-only";

import type { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { ServiceError } from "@/lib/api/api-response";
import { STAFF_MODULES, type AccessLevel } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import type { staffRoleListQuerySchema, staffRoleSchema } from "@/validators/role.validator";

/**
 * Custom Staff roles: a name, an optional description, and an access level per
 * Staff module (no row = No access). A Staff account points at one role, and
 * `getSession` reads the role's levels on every request, so an edit applies
 * on the next request with no cache to clear. See docs/PERMISSIONS.md.
 */

type Tx = Prisma.TransactionClient;
type StaffRoleData = z.output<typeof staffRoleSchema>;
type StaffRoleQuery = z.output<typeof staffRoleListQuerySchema>;

const listSelect = {
  id: true,
  name: true,
  description: true,
  updatedAt: true,
  _count: { select: { users: true } },
} satisfies Prisma.StaffRoleSelect;

type ListRow = Prisma.StaffRoleGetPayload<{ select: typeof listSelect }>;

const notFound = () =>
  new ServiceError("NOT_FOUND", "We couldn't find that role. It may have been deleted.", 404);

const nameKeyOf = (name: string) => name.trim().toLowerCase();

function toListItem({ _count, ...row }: ListRow) {
  return { ...row, staffCount: _count.users };
}

/* ---------- reads ---------- */

export async function listStaffRoles({ page, pageSize, search }: StaffRoleQuery) {
  const where: Prisma.StaffRoleWhereInput = search
    ? { name: { contains: search, mode: "insensitive" } }
    : {};

  const [rows, total] = await prisma.$transaction([
    prisma.staffRole.findMany({
      where,
      select: listSelect,
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.staffRole.count({ where }),
  ]);

  return { items: rows.map(toListItem), page, pageSize, total };
}

export async function getStaffRole(id: string) {
  const row = await prisma.staffRole.findUnique({
    where: { id },
    select: { ...listSelect, permissions: { select: { module: true, level: true } } },
  });
  if (!row) throw notFound();

  const { permissions, ...rest } = row;
  const stored = new Map(permissions.map((entry) => [entry.module, entry.level as AccessLevel]));
  return {
    ...toListItem(rest),
    permissions: Object.fromEntries(
      STAFF_MODULES.map((module) => [module.key, stored.get(module.key) ?? "NONE"]),
    ) as Record<string, AccessLevel>,
  };
}

/* ---------- writes ---------- */

export async function createStaffRole(data: StaffRoleData, actorId: string) {
  const id = await prisma.$transaction(async (tx) => {
    await assertNameFree(tx, data.name);
    const role = await tx.staffRole.create({
      data: { ...roleFields(data), updatedById: actorId },
      select: { id: true },
    });
    await savePermissions(tx, role.id, data.permissions);
    return role.id;
  });

  return getStaffRole(id);
}

export async function updateStaffRole(id: string, data: StaffRoleData, actorId: string) {
  await prisma.$transaction(async (tx) => {
    await assertNameFree(tx, data.name, id);
    const { count } = await tx.staffRole.updateMany({
      where: { id },
      data: { ...roleFields(data), updatedById: actorId },
    });
    if (count === 0) throw notFound();
    await savePermissions(tx, id, data.permissions);
  });

  return getStaffRole(id);
}

/** Refused while any account holds the role, deleted (Trash) accounts included. */
export async function deleteStaffRole(id: string) {
  await prisma.$transaction(async (tx) => {
    const role = await tx.staffRole.findUnique({ where: { id }, select: { _count: { select: { users: true } } } });
    if (!role) throw notFound();

    const holders = role._count.users;
    if (holders > 0) {
      throw new ServiceError(
        "CONFLICT",
        `This role is assigned to ${holders} staff ${holders === 1 ? "account" : "accounts"} (Trash included). Give them another role first.`,
        409,
      );
    }

    await tx.staffRole.delete({ where: { id } });
  });

  return { id };
}

/** For the user service: refuses a Staff role id that doesn't exist. */
export async function assertStaffRoleExists(tx: Tx, id: string) {
  if ((await tx.staffRole.count({ where: { id } })) === 0) {
    const message = "That role no longer exists. Choose another.";
    throw new ServiceError("VALIDATION", message, 422, { staffRoleId: [message] });
  }
}

/* ---------- helpers ---------- */

function roleFields(data: StaffRoleData) {
  return { name: data.name, nameKey: nameKeyOf(data.name), description: data.description };
}

async function assertNameFree(tx: Tx, name: string, exceptId?: string) {
  const owner = await tx.staffRole.findUnique({ where: { nameKey: nameKeyOf(name) }, select: { id: true } });
  if (owner && owner.id !== exceptId) {
    const message = "Another role already has this name.";
    throw new ServiceError("CONFLICT", message, 409, { name: [message] });
  }
}

/** Replaces the role's levels; No access is stored as no row. */
async function savePermissions(tx: Tx, roleId: string, levels: StaffRoleData["permissions"]) {
  await tx.staffRolePermission.deleteMany({ where: { roleId } });
  const rows = Object.entries(levels).flatMap(([module, level]) =>
    level && level !== "NONE" ? [{ roleId, module, level }] : [],
  );
  if (rows.length > 0) await tx.staffRolePermission.createMany({ data: rows });
}
