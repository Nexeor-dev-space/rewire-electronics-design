import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { ServiceError } from "@/lib/api/api-response";
import {
  DB_WRITE_TIMEOUT_MS,
  MS_PER_MINUTE,
  RELEASE_COMPLETE_BATCH,
  RELEASE_HOLD_SWEEP_BATCH,
} from "@/lib/constants";
import { prisma } from "@/lib/db";
import {
  holdCoversLines,
  releaseCapLeft,
  releaseCapMessage,
  releaseOpenForSale,
  releaseStatus,
  type HeldUnits,
} from "@/lib/releases";
import { lockRelease } from "@/services/release-allocation.service";
import { getReleaseHoldMinutes } from "@/services/store-settings.service";
import type { CheckoutHold } from "@/types/order";

type Tx = Prisma.TransactionClient;

export interface ReleaseLine {
  releaseId: string;
  variantId: string;
  quantity: number;
  productName: string;
}

export interface ConvertedHolds {
  holdIds: string[];
  expiresAt: Date | null;
}

interface PlacedLine extends ReleaseLine, HeldUnits {}

type UnitReturn = {
  allocationId: string;
  variantId: string;
  quantity: number;
} & ({ from: "reserved" | "sold"; completed: boolean } | { from: "available"; completed: true });

interface CounterChange {
  available?: number;
  reserved?: number;
  sold?: number;
  returned?: number;
}

const MESSAGE_HOLD_ENDED = "Your hold has ended. Hold again.";
const MESSAGE_UNITS_CHANGED = "This release changed while you were checking out. Try again.";
const MESSAGE_RELEASE_GONE = "This release isn't open for sale.";

const holdSelect = {
  id: true,
  quantity: true,
  expiresAt: true,
  allocation: { select: { id: true, releaseId: true, variantId: true } },
} satisfies Prisma.ReleaseHoldSelect;

const releaseSelect = {
  id: true,
  title: true,
  publishedAt: true,
  completedAt: true,
  startsAt: true,
  endsAt: true,
  hidden: true,
  maxPerCustomer: true,
} satisfies Prisma.ReleaseSelect;

type HoldRow = Prisma.ReleaseHoldGetPayload<{ select: typeof holdSelect }>;
type ReleaseRow = Prisma.ReleaseGetPayload<{ select: typeof releaseSelect }>;
type Releases = Map<string, ReleaseRow>;

const byId = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

const lineKey = (releaseId: string, variantId: string) => `${releaseId}:${variantId}`;

function conflict(message: string) {
  return new ServiceError("CONFLICT", message, 409, { cart: [message] });
}

function closedMessage(title: string, soldOut: boolean) {
  return soldOut ? `${title} is sold out.` : `${title} isn't open for sale.`;
}

function stockMessage(productName: string, available: number) {
  return available > 0 ? `Only ${available} left of ${productName}.` : `${productName} is sold out.`;
}

function sumBy<T>(items: readonly T[], key: (item: T) => string, quantity: (item: T) => number) {
  const totals = new Map<string, number>();
  for (const item of items) totals.set(key(item), (totals.get(key(item)) ?? 0) + quantity(item));
  return [...totals].sort(([a], [b]) => byId(a, b));
}

function earliestExpiry(holds: readonly HoldRow[]): Date | null {
  return holds.reduce<Date | null>((earliest, hold) => (!earliest || hold.expiresAt < earliest ? hold.expiresAt : earliest), null);
}

function holdState(hold: HoldRow) {
  return { allocationId: hold.allocation.id, quantity: hold.quantity, expiresAt: hold.expiresAt };
}

async function lockUserCart(tx: Tx, userId: string, now: Date): Promise<string | null> {
  const { count } = await tx.cart.updateMany({ where: { userId }, data: { updatedAt: now } });
  if (count === 0) return null;
  const cart = await tx.cart.findUnique({ where: { userId }, select: { id: true } });
  return cart?.id ?? null;
}

async function lockReleases(tx: Tx, ids: Iterable<string>): Promise<Releases> {
  const sorted = [...new Set(ids)].sort(byId);
  if (sorted.length === 0) return new Map();
  for (const id of sorted) await lockRelease(tx, id);
  const rows = await tx.release.findMany({ where: { id: { in: sorted } }, select: releaseSelect });
  return new Map(rows.map((row) => [row.id, row]));
}

async function firstClosed(
  tx: Tx,
  releases: Releases,
  lines: readonly ReleaseLine[],
  now: Date,
  options: { held?: boolean } = {},
): Promise<string | null> {
  const releaseIds = [...new Set(lines.map((line) => line.releaseId))];
  const sums = await tx.releaseAllocation.groupBy({
    by: ["releaseId"],
    where: { releaseId: { in: releaseIds } },
    _sum: { available: true },
  });
  const available = new Map(sums.map((row) => [row.releaseId, row._sum.available ?? 0]));
  for (const releaseId of releaseIds) {
    const release = releases.get(releaseId);
    if (!release) return MESSAGE_RELEASE_GONE;
    const status = releaseStatus(release, available.get(releaseId) ?? 0, now);
    if (release.hidden || !releaseOpenForSale(status, options)) {
      return closedMessage(release.title, !release.hidden && status === "SOLD_OUT");
    }
  }
  return null;
}

function cartHolds(tx: Tx, cartId: string) {
  return tx.releaseHold.findMany({ where: { cartId, status: "HELD" }, select: holdSelect });
}

async function cartLines(tx: Tx, cartId: string): Promise<ReleaseLine[]> {
  const items = await tx.cartItem.findMany({
    where: { cartId, releaseId: { not: null } },
    select: { releaseId: true, variantId: true, quantity: true, variant: { select: { product: { select: { name: true } } } } },
  });
  return items.flatMap(({ releaseId, variantId, quantity, variant }) =>
    releaseId ? [{ releaseId, variantId, quantity, productName: variant.product.name }] : [],
  );
}

async function placeLines(tx: Tx, lines: readonly ReleaseLine[]): Promise<PlacedLine[]> {
  const rows = await tx.releaseAllocation.findMany({
    where: { OR: lines.map(({ releaseId, variantId }) => ({ releaseId, variantId })) },
    select: { id: true, releaseId: true, variantId: true },
  });
  const ids = new Map(rows.map((row) => [lineKey(row.releaseId, row.variantId), row.id]));
  return lines.map((line) => {
    const allocationId = ids.get(lineKey(line.releaseId, line.variantId));
    if (!allocationId) throw conflict(stockMessage(line.productName, 0));
    return { ...line, allocationId };
  });
}

async function moveCounters(
  tx: Tx,
  allocationId: string,
  { available = 0, reserved = 0, sold = 0, returned = 0 }: CounterChange,
): Promise<boolean> {
  const { count } = await tx.releaseAllocation.updateMany({
    where: {
      id: allocationId,
      available: { gte: Math.max(0, -available) },
      reserved: { gte: Math.max(0, -reserved) },
      sold: { gte: Math.max(0, -sold) },
      returned: { gte: Math.max(0, -returned) },
    },
    data: {
      available: { increment: available },
      reserved: { increment: reserved },
      sold: { increment: sold },
      returned: { increment: returned },
    },
  });
  return count > 0;
}

const TAKE_UNITS: Record<UnitReturn["from"], (quantity: number) => CounterChange> = {
  available: (quantity) => ({ available: -quantity }),
  reserved: (quantity) => ({ reserved: -quantity }),
  sold: (quantity) => ({ sold: -quantity }),
};

function unitChange(unit: UnitReturn): CounterChange {
  const back = unit.completed ? { returned: unit.quantity } : { available: unit.quantity };
  return { ...TAKE_UNITS[unit.from](unit.quantity), ...back };
}

async function returnUnits(tx: Tx, units: readonly UnitReturn[], shelf: ReadonlyMap<string, number> = new Map()) {
  for (const unit of [...units].sort((a, b) => byId(a.allocationId, b.allocationId))) {
    if (!(await moveCounters(tx, unit.allocationId, unitChange(unit)))) throw conflict(MESSAGE_UNITS_CHANGED);
  }
  const stock = sumBy(
    [...[...shelf].map(([variantId, quantity]) => ({ variantId, quantity })), ...units.filter((unit) => unit.completed)],
    (unit) => unit.variantId,
    (unit) => unit.quantity,
  );
  for (const [variantId, quantity] of stock) {
    await tx.productVariant.updateMany({ where: { id: variantId }, data: { stock: { increment: quantity } } });
  }
}

function holdUnits(hold: HoldRow, from: "reserved" | "sold", completed: boolean): UnitReturn {
  return { allocationId: hold.allocation.id, variantId: hold.allocation.variantId, quantity: hold.quantity, from, completed };
}

const completedIn = (releases: Releases) => (hold: HoldRow) =>
  Boolean(releases.get(hold.allocation.releaseId)?.completedAt);

async function moveHolds(
  tx: Tx,
  holds: readonly HoldRow[],
  where: Prisma.ReleaseHoldWhereInput,
  data: Prisma.ReleaseHoldUpdateManyMutationInput,
): Promise<HoldRow[]> {
  const moved: HoldRow[] = [];
  for (const hold of [...holds].sort((a, b) => byId(a.id, b.id))) {
    const { count } = await tx.releaseHold.updateMany({ where: { ...where, id: hold.id }, data });
    if (count > 0) moved.push(hold);
  }
  return moved;
}

async function releaseHolds(
  tx: Tx,
  holds: readonly HoldRow[],
  releases: Releases,
  where: Prisma.ReleaseHoldWhereInput = {},
) {
  const released = await moveHolds(tx, holds, { ...where, status: "HELD" }, { status: "RELEASED" });
  const completed = completedIn(releases);
  await returnUnits(tx, released.map((hold) => holdUnits(hold, "reserved", completed(hold))));
}

export async function releaseCartHolds(tx: Tx, cartId: string): Promise<void> {
  const holds = await cartHolds(tx, cartId);
  if (holds.length === 0) return;
  const releases = await lockReleases(tx, holds.map((hold) => hold.allocation.releaseId));
  await releaseHolds(tx, holds, releases);
}

async function assertCap(tx: Tx, userId: string, releases: Releases, lines: readonly ReleaseLine[]) {
  const totals = sumBy(lines, (line) => line.releaseId, (line) => line.quantity);
  const tallies = await tx.releaseCustomerTally.findMany({
    where: { userId, releaseId: { in: totals.map(([releaseId]) => releaseId) } },
    select: { releaseId: true, quantity: true },
  });
  const bought = new Map(tallies.map((tally) => [tally.releaseId, tally.quantity]));
  for (const [releaseId, quantity] of totals) {
    const left = releaseCapLeft(releases.get(releaseId)?.maxPerCustomer ?? 0, bought.get(releaseId) ?? 0);
    if (quantity > left) throw conflict(releaseCapMessage(left));
  }
}

async function reserve(tx: Tx, cartId: string, lines: readonly PlacedLine[], expiresAt: Date) {
  for (const line of [...lines].sort((a, b) => byId(a.allocationId, b.allocationId))) {
    if (await moveCounters(tx, line.allocationId, { available: -line.quantity, reserved: line.quantity })) continue;
    const current = await tx.releaseAllocation.findUnique({ where: { id: line.allocationId }, select: { available: true } });
    throw conflict(stockMessage(line.productName, current?.available ?? 0));
  }
  await tx.releaseHold.createMany({
    data: lines.map((line) => ({ allocationId: line.allocationId, cartId, quantity: line.quantity, expiresAt })),
  });
}

async function holdInTransaction(tx: Tx, userId: string, expiresAt: Date, now: Date): Promise<Date | null> {
  const cartId = await lockUserCart(tx, userId, now);
  if (!cartId) return null;
  const lines = await cartLines(tx, cartId);
  const holds = await cartHolds(tx, cartId);
  const releases = await lockReleases(tx, [
    ...lines.map((line) => line.releaseId),
    ...holds.map((hold) => hold.allocation.releaseId),
  ]);
  const placed = lines.length > 0 ? await placeLines(tx, lines) : [];

  const unchanged =
    placed.length > 0 &&
    holdCoversLines(holds.map(holdState), placed, now) &&
    (await firstClosed(tx, releases, placed, now, { held: true })) === null;
  if (unchanged) return earliestExpiry(holds);

  await releaseHolds(tx, holds, releases);
  if (placed.length === 0) return null;

  const closed = await firstClosed(tx, releases, placed, now);
  if (closed) throw conflict(closed);
  await assertCap(tx, userId, releases, placed);
  await reserve(tx, cartId, placed, expiresAt);
  return expiresAt;
}

export async function holdCart(userId: string, now: Date): Promise<CheckoutHold> {
  const minutes = await getReleaseHoldMinutes();
  const expiresAt = await prisma.$transaction(
    (tx) => holdInTransaction(tx, userId, new Date(now.getTime() + minutes * MS_PER_MINUTE), now),
    { timeout: DB_WRITE_TIMEOUT_MS },
  );
  return { expiresAt: expiresAt ? expiresAt.toISOString() : null };
}

async function addToTallies(tx: Tx, userId: string, releases: Releases, holds: readonly HoldRow[]) {
  const totals = sumBy(holds, (hold) => hold.allocation.releaseId, (hold) => hold.quantity);
  await tx.releaseCustomerTally.createMany({
    data: totals.map(([releaseId]) => ({ releaseId, userId })),
    skipDuplicates: true,
  });
  for (const [releaseId, quantity] of totals) {
    const max = releases.get(releaseId)?.maxPerCustomer ?? 0;
    const { count } = await tx.releaseCustomerTally.updateMany({
      where: { releaseId, userId, quantity: { lte: max - quantity } },
      data: { quantity: { increment: quantity } },
    });
    if (count > 0) continue;
    const tally = await tx.releaseCustomerTally.findUnique({
      where: { releaseId_userId: { releaseId, userId } },
      select: { quantity: true },
    });
    throw conflict(releaseCapMessage(releaseCapLeft(max, tally?.quantity ?? 0)));
  }
}

export async function convertCartHolds(
  tx: Tx,
  cartId: string,
  userId: string,
  lines: readonly ReleaseLine[],
  now: Date,
): Promise<ConvertedHolds> {
  if (lines.length === 0) return { holdIds: [], expiresAt: null };
  const holds = await cartHolds(tx, cartId);
  const releases = await lockReleases(tx, [
    ...lines.map((line) => line.releaseId),
    ...holds.map((hold) => hold.allocation.releaseId),
  ]);
  const closed = await firstClosed(tx, releases, lines, now, { held: true });
  if (closed) throw conflict(closed);
  const placed = await placeLines(tx, lines);
  if (!holdCoversLines(holds.map(holdState), placed, now)) throw conflict(MESSAGE_HOLD_ENDED);

  const ordered = await moveHolds(tx, holds, { cartId, status: "HELD", expiresAt: { gt: now } }, { status: "ORDERED" });
  if (ordered.length !== holds.length) throw conflict(MESSAGE_HOLD_ENDED);
  for (const hold of [...ordered].sort((a, b) => byId(a.allocation.id, b.allocation.id))) {
    const moved = await moveCounters(tx, hold.allocation.id, { reserved: -hold.quantity, sold: hold.quantity });
    if (!moved) throw conflict(MESSAGE_UNITS_CHANGED);
  }
  await addToTallies(tx, userId, releases, ordered);
  return { holdIds: ordered.map((hold) => hold.id), expiresAt: earliestExpiry(ordered) };
}

async function takeFromTallies(tx: Tx, orderId: string, holds: readonly HoldRow[]) {
  if (holds.length === 0) return;
  const order = await tx.order.findUnique({ where: { id: orderId }, select: { userId: true } });
  const userId = order?.userId;
  if (!userId) return;
  for (const [releaseId, quantity] of sumBy(holds, (hold) => hold.allocation.releaseId, (hold) => hold.quantity)) {
    await tx.releaseCustomerTally.updateMany({
      where: { releaseId, userId, quantity: { gte: quantity } },
      data: { quantity: { decrement: quantity } },
    });
  }
}

export async function releaseOrderHolds(
  tx: Tx,
  orderId: string,
  shelf: ReadonlyMap<string, number> = new Map(),
): Promise<void> {
  const holds = await tx.releaseHold.findMany({ where: { orderId, status: "ORDERED" }, select: holdSelect });
  const releases = await lockReleases(tx, holds.map((hold) => hold.allocation.releaseId));
  const released = await moveHolds(tx, holds, { orderId, status: "ORDERED" }, { status: "RELEASED" });
  await takeFromTallies(tx, orderId, released);
  const completed = completedIn(releases);
  await returnUnits(tx, released.map((hold) => holdUnits(hold, "sold", completed(hold))), shelf);
}

async function forEachRelease(ids: readonly string[], task: string, run: (tx: Tx, id: string) => Promise<void>) {
  for (const id of ids) {
    try {
      await prisma.$transaction((tx) => run(tx, id), { timeout: DB_WRITE_TIMEOUT_MS });
    } catch (error) {
      console.error(`${task} failed for release ${id}`, error);
    }
  }
}

async function expireReleaseHolds(tx: Tx, releaseId: string, now: Date) {
  const releases = await lockReleases(tx, [releaseId]);
  const holds = await tx.releaseHold.findMany({
    where: { status: "HELD", expiresAt: { lte: now }, allocation: { releaseId } },
    select: holdSelect,
    orderBy: { expiresAt: "asc" },
    take: RELEASE_HOLD_SWEEP_BATCH,
  });
  await releaseHolds(tx, holds, releases, { expiresAt: { lte: now } });
}

export async function expireHolds(now: Date): Promise<void> {
  const due = await prisma.releaseHold.findMany({
    where: { status: "HELD", expiresAt: { lte: now } },
    select: { allocation: { select: { releaseId: true } } },
    orderBy: { expiresAt: "asc" },
    take: RELEASE_HOLD_SWEEP_BATCH,
  });
  const releaseIds = [...new Set(due.map((hold) => hold.allocation.releaseId))].sort(byId);
  await forEachRelease(releaseIds, "Expiring holds", (tx, id) => expireReleaseHolds(tx, id, now));
}

export async function completeRelease(tx: Tx, releaseId: string, now: Date): Promise<void> {
  const { count } = await tx.release.updateMany({ where: { id: releaseId, completedAt: null }, data: { completedAt: now } });
  if (count === 0) return;
  const holds = await tx.releaseHold.findMany({ where: { status: "HELD", allocation: { releaseId } }, select: holdSelect });
  const released = await moveHolds(tx, holds, { status: "HELD" }, { status: "RELEASED" });
  const unsold = await tx.releaseAllocation.findMany({
    where: { releaseId, available: { gt: 0 } },
    select: { id: true, variantId: true, available: true },
  });
  await returnUnits(tx, [
    ...released.map((hold) => holdUnits(hold, "reserved", true)),
    ...unsold.map((row): UnitReturn => ({
      allocationId: row.id,
      variantId: row.variantId,
      quantity: row.available,
      from: "available",
      completed: true,
    })),
  ]);
}

function endedWhere(now: Date): Prisma.ReleaseWhereInput {
  return { publishedAt: { not: null }, completedAt: null, endsAt: { lte: now } };
}

export async function completeEndedReleases(now: Date): Promise<void> {
  const ended = await prisma.release.findMany({
    where: endedWhere(now),
    select: { id: true },
    orderBy: [{ endsAt: "asc" }, { id: "asc" }],
    take: RELEASE_COMPLETE_BATCH,
  });
  await forEachRelease(
    ended.map((release) => release.id),
    "Completing",
    async (tx, id) => {
      if (await lockRelease(tx, id, endedWhere(now))) await completeRelease(tx, id, now);
    },
  );
}
