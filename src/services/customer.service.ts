import "server-only";

import type { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { ServiceError } from "@/lib/api/api-response";
import { hashPassword } from "@/lib/auth/password";
import { assignableRoles, canManageUser, canSetPassword, type Actor } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import type { customerListQuerySchema, customerSchema } from "@/validators/customer.validator";

/**
 * Customer management for the console. Deleting is soft: `state` becomes
 * INACTIVE, and every read here only sees ACTIVE users.
 */

type Tx = Prisma.TransactionClient;
type CustomerData = z.output<typeof customerSchema>;

const customerSelect = {
  id: true,
  fullName: true,
  email: true,
  phone: true,
  role: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

const notFound = () =>
  new ServiceError("NOT_FOUND", "We couldn't find that customer. They may have been deleted.", 404);

export async function listCustomers({
  page,
  pageSize,
  search,
}: z.output<typeof customerListQuerySchema>) {
  const where: Prisma.UserWhereInput = {
    state: "ACTIVE",
    ...(search
      ? {
          OR: [
            { fullName: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { phone: { contains: search } },
          ],
        }
      : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      select: customerSelect,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ]);

  return { items, page, pageSize, total };
}

export async function getCustomer(id: string) {
  const user = await prisma.user.findFirst({
    where: { id, state: "ACTIVE" },
    select: {
      ...customerSelect,
      passwordHash: true,
      addresses: {
        select: { id: true, emirate: true, street: true, landmark: true, isPrimary: true },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      },
    },
  });
  if (!user) throw notFound();

  const { passwordHash, ...customer } = user;
  return { ...customer, hasPassword: passwordHash !== null };
}

export async function createCustomer(viewer: Actor, data: CustomerData) {
  checkRoleAndPassword(viewer, data);
  const passwordHash = data.password ? await hashPassword(data.password) : null;

  const id = await prisma.$transaction(async (tx) => {
    await assertEmailFree(tx, data.email);
    const user = await tx.user.create({
      data: {
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        role: data.role,
        passwordHash,
      },
      select: { id: true },
    });
    await saveAddresses(tx, user.id, data.addresses);
    return user.id;
  });

  return getCustomer(id);
}

export async function updateCustomer(viewer: Actor, id: string, data: CustomerData) {
  checkRoleAndPassword(viewer, data);
  const passwordHash = data.password ? await hashPassword(data.password) : undefined;

  await prisma.$transaction(async (tx) => {
    const target = await findManageable(tx, viewer, id);

    if (data.role !== target.role) {
      if (viewer.id === id) {
        throw new ServiceError("FORBIDDEN", "You can't change your own role.", 403, {
          role: ["You can't change your own role."],
        });
      }
      if (target.role === "ADMIN") await assertAnotherAdmin(tx, id);
    }

    await assertEmailFree(tx, data.email, id);
    await saveAddresses(tx, id, data.addresses);
    await tx.user.update({
      where: { id },
      data: {
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        role: data.role,
        passwordHash,
        // Address-only edits still count as editing the customer.
        updatedAt: new Date(),
      },
    });
  });

  return getCustomer(id);
}

export async function deleteCustomer(viewer: Actor, id: string) {
  if (viewer.id === id) {
    throw new ServiceError("FORBIDDEN", "You can't delete your own account.", 403);
  }

  await prisma.$transaction(async (tx) => {
    const target = await findManageable(tx, viewer, id);
    if (target.role === "ADMIN") await assertAnotherAdmin(tx, id);
    await tx.user.update({ where: { id }, data: { state: "INACTIVE" } });
  });

  return { id };
}

/* ---------- rules ---------- */

function checkRoleAndPassword(viewer: Actor, data: CustomerData) {
  if (!assignableRoles(viewer.role).includes(data.role)) {
    throw new ServiceError("FORBIDDEN", "Only an admin can give someone the Admin role.", 403, {
      role: ["Only an admin can give someone the Admin role."],
    });
  }
  if (data.password && !canSetPassword(viewer.role)) {
    throw new ServiceError("FORBIDDEN", "Only an admin can set passwords.", 403);
  }
}

async function findManageable(tx: Tx, viewer: Actor, id: string) {
  const target = await tx.user.findFirst({ where: { id, state: "ACTIVE" }, select: { role: true } });
  if (!target) throw notFound();
  if (!canManageUser(viewer, target)) {
    throw new ServiceError("FORBIDDEN", "Only an admin can change an admin account.", 403);
  }
  return target;
}

async function assertEmailFree(tx: Tx, email: string, exceptId?: string) {
  const owner = await tx.user.findUnique({ where: { email }, select: { id: true } });
  if (owner && owner.id !== exceptId) {
    // Deleted (INACTIVE) accounts keep their email too.
    const message = "An account with this email already exists.";
    throw new ServiceError("CONFLICT", message, 409, { email: [message] });
  }
}

async function assertAnotherAdmin(tx: Tx, id: string) {
  const others = await tx.user.count({ where: { role: "ADMIN", state: "ACTIVE", id: { not: id } } });
  if (others === 0) {
    throw new ServiceError("CONFLICT", "There must be at least one admin.", 409);
  }
}

/**
 * Replaces the user's addresses with `list`. The primary is the one marked,
 * or the first when none is, so there is always exactly one.
 */
async function saveAddresses(tx: Tx, userId: string, list: CustomerData["addresses"]) {
  const primaryIndex = Math.max(0, list.findIndex((address) => address.isPrimary));

  await tx.address.deleteMany({
    where: { userId, id: { notIn: list.flatMap((address) => (address.id ? [address.id] : [])) } },
  });

  for (const [index, { id, ...fields }] of list.entries()) {
    const data = { ...fields, isPrimary: index === primaryIndex };
    if (id) {
      // Filtering by userId is the ownership check.
      const { count } = await tx.address.updateMany({ where: { id, userId }, data });
      if (count === 0) {
        throw new ServiceError("CONFLICT", "An address changed elsewhere. Reopen the customer and try again.", 409);
      }
    } else {
      await tx.address.create({ data: { ...data, userId } });
    }
  }
}
