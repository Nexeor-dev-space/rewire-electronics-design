import "server-only";

import { ServiceError } from "@/lib/api/api-response";
import { prisma } from "@/lib/db";
import {
  normaliseSku,
  planProductCleanup,
  type ProductCleanupPlan,
  type SheetProduct,
  type StoredProduct,
} from "@/lib/dummy-cleanup";
import { deleteProduct, purgeProduct } from "./product.service";

export const UNTOUCHED_TABLES = ["orders", "orderItems", "users", "releases", "brands", "categories", "addOns"] as const;

export type UntouchedCounts = Record<(typeof UNTOUCHED_TABLES)[number], number>;

export interface RemovedProductLinks {
  cartItems: number;
  orderItems: number;
  homepageItems: number;
  campaignLinks: number;
  couponLinks: number;
  releases: number;
  releaseAllocations: number;
}

export interface CleanupSnapshot {
  plan: ProductCleanupPlan;
  addresses: number;
  links: RemovedProductLinks;
  untouched: UntouchedCounts;
}

export interface SkippedProduct {
  product: StoredProduct;
  reason: string;
}

export interface CleanupResult {
  purged: StoredProduct[];
  skipped: SkippedProduct[];
  addressesDeleted: number;
}

async function storedProducts(): Promise<StoredProduct[]> {
  const rows = await prisma.product.findMany({
    select: { id: true, slug: true, name: true, deletedAt: true, variants: { select: { sku: true } } },
    orderBy: { id: "asc" },
  });
  return rows.map(({ variants, ...product }) => ({ ...product, skus: variants.map((variant) => variant.sku) }));
}

async function removedLinks(ids: string[]): Promise<RemovedProductLinks> {
  const product = { productId: { in: ids } };
  const variant = { variant: { productId: { in: ids } } };
  const [cartItems, orderItems, homepageItems, campaignLinks, couponLinks, releases, releaseAllocations] =
    await prisma.$transaction([
      prisma.cartItem.count({ where: variant }),
      prisma.orderItem.count({ where: variant }),
      prisma.homepageSectionItem.count({ where: product }),
      prisma.campaignProduct.count({ where: product }),
      prisma.couponProduct.count({ where: product }),
      prisma.release.count({ where: product }),
      prisma.releaseAllocation.count({ where: variant }),
    ]);
  return { cartItems, orderItems, homepageItems, campaignLinks, couponLinks, releases, releaseAllocations };
}

async function untouchedCounts(): Promise<UntouchedCounts> {
  const [orders, orderItems, users, releases, brands, categories, addOns] = await prisma.$transaction([
    prisma.order.count(),
    prisma.orderItem.count(),
    prisma.user.count(),
    prisma.release.count(),
    prisma.brand.count(),
    prisma.category.count(),
    prisma.addOn.count(),
  ]);
  return { orders, orderItems, users, releases, brands, categories, addOns };
}

export async function loadCleanupSnapshot(sheet: readonly SheetProduct[]): Promise<CleanupSnapshot> {
  const plan = planProductCleanup(sheet, await storedProducts());
  const [addresses, links, untouched] = await Promise.all([
    prisma.address.count(),
    removedLinks(plan.remove.map((product) => product.id)),
    untouchedCounts(),
  ]);
  return { plan, addresses, links, untouched };
}

export async function applyCleanup(snapshot: CleanupSnapshot): Promise<CleanupResult> {
  if (snapshot.plan.blockers.length > 0) {
    throw new ServiceError("CONFLICT", snapshot.plan.blockers.join(" "), 409);
  }

  const purged: StoredProduct[] = [];
  const skipped: SkippedProduct[] = [];
  for (const product of snapshot.plan.remove) {
    try {
      if (product.deletedAt === null) await deleteProduct(product.id);
      await purgeProduct(product.id);
      purged.push(product);
    } catch (error) {
      if (!(error instanceof ServiceError)) throw error;
      skipped.push({ product, reason: error.message });
    }
  }

  const { count: addressesDeleted } = await prisma.address.deleteMany({});
  return { purged, skipped, addressesDeleted };
}

const keptSkuCount = (plan: ProductCleanupPlan) =>
  new Set(plan.keep.flatMap((product) => product.skus.map(normaliseSku))).size;

export function cleanupProblems(before: CleanupSnapshot, after: CleanupSnapshot, result: CleanupResult): string[] {
  const problems: string[] = [];
  const skippedIds = new Set(result.skipped.map(({ product }) => product.id));

  const leftover = after.plan.remove.filter((product) => !skippedIds.has(product.id));
  if (leftover.length > 0) {
    problems.push(`${leftover.length} products outside the sheet are still there: ${leftover.map((p) => p.slug).join(", ")}.`);
  }

  const keptAfter = new Set(after.plan.keep.map((product) => product.id));
  const lost = before.plan.keep.filter((product) => !keptAfter.has(product.id));
  if (lost.length > 0) problems.push(`${lost.length} sheet products are gone: ${lost.map((p) => p.slug).join(", ")}.`);

  if (keptSkuCount(after.plan) !== keptSkuCount(before.plan)) {
    problems.push(`Sheet products had ${keptSkuCount(before.plan)} SKUs and now have ${keptSkuCount(after.plan)}.`);
  }
  if (after.plan.blockers.length > 0) problems.push(...after.plan.blockers);
  if (after.addresses !== 0) problems.push(`${after.addresses} saved addresses are still there.`);

  for (const table of UNTOUCHED_TABLES) {
    if (after.untouched[table] !== before.untouched[table]) {
      problems.push(`${table} changed from ${before.untouched[table]} to ${after.untouched[table]}.`);
    }
  }
  return problems;
}

export async function verifyCleanup(
  sheet: readonly SheetProduct[],
  before: CleanupSnapshot,
  result: CleanupResult,
): Promise<string[]> {
  return cleanupProblems(before, await loadCleanupSnapshot(sheet), result);
}
