import { beforeEach, describe, expect, it, vi } from "vitest";
import { ServiceError } from "@/lib/api/api-response";
import type { SheetProduct, StoredProduct } from "@/lib/dummy-cleanup";

const { db, deleteProduct, purgeProduct, deleteAddresses, tableCount, linkCount } = vi.hoisted(() => {
  const db = {
    products: [] as { id: string; slug: string; name: string; deletedAt: Date | null; skus: string[] }[],
    addresses: 0,
    linked: 0,
    tables: { orders: 0, orderItems: 0, users: 0, releases: 0, brands: 0, categories: 0, addOns: 0 },
  };
  return {
    db,
    tableCount: (table: keyof typeof db.tables) =>
      vi.fn(async (args?: { where?: unknown }) => (args?.where ? db.linked : db.tables[table])),
    linkCount: () => vi.fn(async () => db.linked),
    deleteProduct: vi.fn(async (id: string) => {
      const product = db.products.find((row) => row.id === id && row.deletedAt === null);
      if (!product) throw new Error(`not live: ${id}`);
      product.deletedAt = new Date();
      return { id };
    }),
    purgeProduct: vi.fn(async (id: string) => {
      db.products = db.products.filter((row) => row.id !== id);
      return { id };
    }),
    deleteAddresses: vi.fn(async () => {
      const count = db.addresses;
      db.addresses = 0;
      return { count };
    }),
  };
});

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({
  prisma: {
    product: {
      findMany: vi.fn(async () =>
        db.products.map(({ skus, ...product }) => ({ ...product, variants: skus.map((sku) => ({ sku })) })),
      ),
    },
    address: { count: vi.fn(async () => db.addresses), deleteMany: deleteAddresses },
    cartItem: { count: linkCount() },
    homepageSectionItem: { count: linkCount() },
    campaignProduct: { count: linkCount() },
    couponProduct: { count: linkCount() },
    releaseAllocation: { count: linkCount() },
    orderItem: { count: tableCount("orderItems") },
    release: { count: tableCount("releases") },
    order: { count: tableCount("orders") },
    user: { count: tableCount("users") },
    brand: { count: tableCount("brands") },
    category: { count: tableCount("categories") },
    addOn: { count: tableCount("addOns") },
    $transaction: vi.fn(async (queries: Promise<number>[]) => Promise.all(queries)),
  },
}));
vi.mock("./product.service", () => ({ deleteProduct, purgeProduct }));

import { applyCleanup, cleanupProblems, loadCleanupSnapshot, verifyCleanup } from "./dummy-cleanup.service";

const SHEET: SheetProduct[] = [
  { slug: "iphone-12", name: "iPhone 12", skus: ["SKU-019", "SKU-020"] },
  { slug: "iphone-13", name: "iPhone 13", skus: ["SKU-055"] },
];

function product(slug: string, skus: string[], deletedAt: Date | null = null) {
  return { id: `id-${slug}`, slug, name: slug, deletedAt, skus };
}

beforeEach(() => {
  vi.clearAllMocks();
  db.products = [
    product("iphone-12", ["SKU-019", "SKU-020"]),
    product("iphone-13", ["SKU-055"]),
    product("apple-iphone-14-pro", ["APPLE-IPHONE-14-PRO-256GB"]),
    product("sony-wh-1000xm4", ["SONY-WH-1000XM4"], new Date("2026-11-01")),
  ];
  db.addresses = 3;
  db.linked = 2;
  db.tables = { orders: 5, orderItems: 9, users: 4, releases: 1, brands: 6, categories: 3, addOns: 2 };
});

const slugs = (products: StoredProduct[]) => products.map((row) => row.slug);

describe("dry run", () => {
  it("reports the plan and writes nothing", async () => {
    const snapshot = await loadCleanupSnapshot(SHEET);

    expect(slugs(snapshot.plan.keep)).toEqual(["iphone-12", "iphone-13"]);
    expect(slugs(snapshot.plan.remove)).toEqual(["apple-iphone-14-pro", "sony-wh-1000xm4"]);
    expect(snapshot.addresses).toBe(3);
    expect(snapshot.links.cartItems).toBe(2);
    expect(snapshot.untouched.orderItems).toBe(9);
    expect(deleteProduct).not.toHaveBeenCalled();
    expect(purgeProduct).not.toHaveBeenCalled();
    expect(deleteAddresses).not.toHaveBeenCalled();
    expect(db.products).toHaveLength(4);
  });
});

describe("applyCleanup", () => {
  it("moves a live product to Trash before purging it, and purges a Trash product directly", async () => {
    const result = await applyCleanup(await loadCleanupSnapshot(SHEET));

    expect(deleteProduct).toHaveBeenCalledTimes(1);
    expect(deleteProduct).toHaveBeenCalledWith("id-apple-iphone-14-pro");
    expect(purgeProduct.mock.calls.map(([id]) => id)).toEqual(["id-apple-iphone-14-pro", "id-sony-wh-1000xm4"]);
    expect(deleteProduct.mock.invocationCallOrder[0]).toBeLessThan(purgeProduct.mock.invocationCallOrder[0]);
    expect(slugs(result.purged)).toEqual(["apple-iphone-14-pro", "sony-wh-1000xm4"]);
    expect(slugs(db.products)).toEqual(["iphone-12", "iphone-13"]);
  });

  it("deletes every saved address and reports how many", async () => {
    const result = await applyCleanup(await loadCleanupSnapshot(SHEET));
    expect(deleteAddresses).toHaveBeenCalledWith({});
    expect(result.addressesDeleted).toBe(3);
    expect(db.addresses).toBe(0);
  });

  it("skips a product the purge refuses and carries on with the rest", async () => {
    purgeProduct.mockImplementationOnce(async () => {
      throw new ServiceError("CONFLICT", "This product is in a release. Take it out of the release first.", 409);
    });
    const before = await loadCleanupSnapshot(SHEET);
    const result = await applyCleanup(before);

    expect(result.skipped).toEqual([
      { product: before.plan.remove[0], reason: "This product is in a release. Take it out of the release first." },
    ]);
    expect(slugs(result.purged)).toEqual(["sony-wh-1000xm4"]);
    expect(result.addressesDeleted).toBe(3);
    expect(await verifyCleanup(SHEET, before, result)).toEqual([]);
  });

  it("stops on an unexpected error and leaves the addresses alone", async () => {
    purgeProduct.mockRejectedValueOnce(new Error("connection lost"));
    await expect(applyCleanup(await loadCleanupSnapshot(SHEET))).rejects.toThrow("connection lost");
    expect(deleteAddresses).not.toHaveBeenCalled();
    expect(purgeProduct).toHaveBeenCalledTimes(1);
  });

  it("refuses to write anything when the plan has blockers", async () => {
    db.products = db.products.filter((row) => row.slug !== "iphone-13");
    const snapshot = await loadCleanupSnapshot(SHEET);

    expect(snapshot.plan.blockers).toHaveLength(1);
    await expect(applyCleanup(snapshot)).rejects.toBeInstanceOf(ServiceError);
    expect(deleteProduct).not.toHaveBeenCalled();
    expect(purgeProduct).not.toHaveBeenCalled();
    expect(deleteAddresses).not.toHaveBeenCalled();
  });

  it("finds nothing to do on a second run", async () => {
    await applyCleanup(await loadCleanupSnapshot(SHEET));
    vi.clearAllMocks();

    const again = await loadCleanupSnapshot(SHEET);
    const result = await applyCleanup(again);

    expect(again.plan.remove).toEqual([]);
    expect(again.addresses).toBe(0);
    expect(purgeProduct).not.toHaveBeenCalled();
    expect(result.addressesDeleted).toBe(0);
  });

  it("passes verification after a clean run", async () => {
    const before = await loadCleanupSnapshot(SHEET);
    const result = await applyCleanup(before);
    expect(await verifyCleanup(SHEET, before, result)).toEqual([]);
  });
});

describe("cleanupProblems", () => {
  async function cleanRun() {
    const before = await loadCleanupSnapshot(SHEET);
    const result = await applyCleanup(before);
    const after = await loadCleanupSnapshot(SHEET);
    return { before, result, after };
  }

  it("flags a product outside the sheet that is still there", async () => {
    const { before, result, after } = await cleanRun();
    const leftover = { ...after, plan: { ...after.plan, remove: [product("ghost", ["G-1"])] } };
    expect(cleanupProblems(before, leftover, result)[0]).toMatch(/still there: ghost/);
  });

  it("flags a sheet product that disappeared", async () => {
    const { before, result, after } = await cleanRun();
    const lost = { ...after, plan: { ...after.plan, keep: after.plan.keep.slice(0, 1) } };
    const problems = cleanupProblems(before, lost, result);
    expect(problems.some((problem) => /sheet products are gone: iphone-13/.test(problem))).toBe(true);
  });

  it("flags a sheet SKU that disappeared", async () => {
    const { before, result, after } = await cleanRun();
    const [first, ...rest] = after.plan.keep;
    const fewer = { ...after, plan: { ...after.plan, keep: [{ ...first, skus: first.skus.slice(1) }, ...rest] } };
    expect(cleanupProblems(before, fewer, result)).toEqual(["Sheet products had 3 SKUs and now have 2."]);
  });

  it("flags saved addresses that are still there", async () => {
    const { before, result, after } = await cleanRun();
    expect(cleanupProblems(before, { ...after, addresses: 1 }, result)).toEqual(["1 saved addresses are still there."]);
  });

  it("flags a change in a table the cleanup must not touch", async () => {
    const { before, result, after } = await cleanRun();
    const changed = { ...after, untouched: { ...after.untouched, orderItems: 7 } };
    expect(cleanupProblems(before, changed, result)).toEqual(["orderItems changed from 9 to 7."]);
  });
});
