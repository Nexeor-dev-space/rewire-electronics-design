import { describe, expect, it } from "vitest";
import { CART_MAX_LINES, CART_MAX_LINE_QUANTITY } from "@/lib/constants";
import {
  isProductVisible,
  lineIssues,
  maxLineQuantity,
  pickLineImage,
  planCartMerge,
  quantityProblem,
  unionIds,
  type LineIssueInput,
  type MergeLine,
} from "./cart-rules";

const baseLine: LineIssueInput = {
  visible: true,
  releaseClosed: false,
  stock: 10,
  quantity: 1,
  unitPrice: 100_00,
  seenUnitPrice: 100_00,
  addOns: [],
};

function line(id: string, variantId: string, quantity = 1, addOnIds: string[] = [], releaseId: string | null = null): MergeLine {
  return { id, variantId, releaseId, quantity, addOnIds };
}

describe("isProductVisible", () => {
  const published = { status: "PUBLISHED", category: { status: "PUBLISHED", parent: null } };

  it("accepts a published product in a published top level category", () => {
    expect(isProductVisible(published)).toBe(true);
  });

  it("rejects a draft or archived product", () => {
    expect(isProductVisible({ ...published, status: "ARCHIVED" })).toBe(false);
  });

  it("rejects a hidden category or a hidden parent", () => {
    expect(isProductVisible({ ...published, category: { status: "DRAFT", parent: null } })).toBe(false);
    expect(
      isProductVisible({
        ...published,
        category: { status: "PUBLISHED", parent: { status: "ARCHIVED" } },
      }),
    ).toBe(false);
  });
});

describe("lineIssues", () => {
  it("has no issues for a healthy line", () => {
    expect(lineIssues(baseLine)).toEqual([]);
  });

  it("flags unavailable before any stock issue", () => {
    expect(lineIssues({ ...baseLine, visible: false, stock: 0 })).toEqual(["UNAVAILABLE"]);
  });

  it("flags a closed release after unavailable and before any stock issue", () => {
    expect(lineIssues({ ...baseLine, releaseClosed: true })).toEqual(["RELEASE_CLOSED"]);
    expect(lineIssues({ ...baseLine, releaseClosed: true, stock: 0 })).toEqual(["RELEASE_CLOSED"]);
    expect(lineIssues({ ...baseLine, releaseClosed: true, visible: false })).toEqual(["UNAVAILABLE"]);
  });

  it("flags out of stock and insufficient stock", () => {
    expect(lineIssues({ ...baseLine, stock: 0 })).toEqual(["OUT_OF_STOCK"]);
    expect(lineIssues({ ...baseLine, stock: 2, quantity: 3 })).toEqual(["INSUFFICIENT_STOCK"]);
    expect(lineIssues({ ...baseLine, stock: 3, quantity: 3 })).toEqual([]);
  });

  it("flags a variant price change", () => {
    expect(lineIssues({ ...baseLine, seenUnitPrice: 90_00 })).toEqual(["PRICE_CHANGED"]);
  });

  it("flags an available add-on price change", () => {
    const addOns = [{ price: 20_00, seenPrice: 15_00, available: true }];
    expect(lineIssues({ ...baseLine, addOns })).toEqual(["PRICE_CHANGED"]);
  });

  it("flags an unavailable add-on without treating its price as changed", () => {
    const addOns = [{ price: 20_00, seenPrice: 15_00, available: false }];
    expect(lineIssues({ ...baseLine, addOns })).toEqual(["ADD_ON_UNAVAILABLE"]);
  });
});

describe("maxLineQuantity", () => {
  it("is the lower of stock and the line cap, never negative", () => {
    expect(maxLineQuantity(2)).toBe(2);
    expect(maxLineQuantity(100)).toBe(CART_MAX_LINE_QUANTITY);
    expect(maxLineQuantity(-1)).toBe(0);
  });
});

describe("quantityProblem", () => {
  const check = { requested: 2, current: 1, stock: 10, visible: true };

  it("allows an increase within stock and the cap", () => {
    expect(quantityProblem(check)).toBeNull();
  });

  it("always allows a decrease or no change", () => {
    expect(quantityProblem({ ...check, requested: 1, current: 4, stock: 0, visible: false })).toBeNull();
    expect(quantityProblem({ ...check, requested: 4, current: 4, stock: 2 })).toBeNull();
  });

  it("refuses an increase on an unavailable or out of stock item", () => {
    expect(quantityProblem({ ...check, visible: false })).toBe("UNAVAILABLE");
    expect(quantityProblem({ ...check, stock: 0 })).toBe("OUT_OF_STOCK");
  });

  it("reports stock before the line cap", () => {
    expect(quantityProblem({ ...check, requested: CART_MAX_LINE_QUANTITY + 1, stock: 3 })).toBe(
      "INSUFFICIENT_STOCK",
    );
    expect(quantityProblem({ ...check, requested: CART_MAX_LINE_QUANTITY + 1, stock: 100 })).toBe(
      "LINE_CAP",
    );
  });
});

describe("unionIds", () => {
  it("keeps first seen order and drops duplicates", () => {
    expect(unionIds(["a", "b"], ["b", "c"])).toEqual(["a", "b", "c"]);
  });
});

describe("pickLineImage", () => {
  const images = [
    { mediaId: "blue", alt: "", colour: "Blue" },
    { mediaId: "plain", alt: "", colour: null },
    { mediaId: "red", alt: "", colour: "Red" },
  ];

  it("prefers the image tagged with the variant colour", () => {
    expect(pickLineImage(images, "Red")?.mediaId).toBe("red");
  });

  it("falls back to the first untagged image, then the first image", () => {
    expect(pickLineImage(images, "Green")?.mediaId).toBe("plain");
    expect(pickLineImage(images, null)?.mediaId).toBe("plain");
    expect(pickLineImage([images[0]], "Green")?.mediaId).toBe("blue");
  });

  it("returns null with no images", () => {
    expect(pickLineImage([], "Red")).toBeNull();
  });
});

describe("planCartMerge", () => {
  it("moves guest lines for variants the user does not have", () => {
    const plan = planCartMerge([line("u1", "v1")], [line("g1", "v2"), line("g2", "v3")]);
    expect(plan).toEqual({ updates: [], moves: ["g1", "g2"], dropped: [] });
  });

  it("sums the same variant, capped, and adds only the missing add-ons", () => {
    const plan = planCartMerge(
      [line("u1", "v1", CART_MAX_LINE_QUANTITY - 1, ["a"])],
      [line("g1", "v1", 3, ["a", "b"])],
    );
    expect(plan.updates).toEqual([
      { userLineId: "u1", guestLineId: "g1", quantity: CART_MAX_LINE_QUANTITY, addOnIds: ["b"] },
    ]);
    expect(plan.moves).toEqual([]);
  });

  it("keeps the newest guest lines and drops the rest past the line cap", () => {
    const userLines = Array.from({ length: CART_MAX_LINES - 1 }, (_, index) => line(`u${index}`, `uv${index}`));
    const plan = planCartMerge(userLines, [line("new", "v1"), line("old", "v2")]);
    expect(plan.moves).toEqual(["new"]);
    expect(plan.dropped).toEqual(["old"]);
  });

  it("sums the same variant from the same release", () => {
    const plan = planCartMerge([line("u1", "v1", 1, [], "r1")], [line("g1", "v1", 1, [], "r1")]);
    expect(plan.updates).toEqual([{ userLineId: "u1", guestLineId: "g1", quantity: 2, addOnIds: [] }]);
  });

  it("keeps the user's line when the same variant comes from the shop and a release", () => {
    const fromRelease = planCartMerge([line("u1", "v1")], [line("g1", "v1", 1, [], "r1")]);
    expect(fromRelease).toEqual({ updates: [], moves: [], dropped: ["g1"] });
    const fromShop = planCartMerge([line("u1", "v1", 1, [], "r1")], [line("g1", "v1")]);
    expect(fromShop).toEqual({ updates: [], moves: [], dropped: ["g1"] });
    const otherRelease = planCartMerge([line("u1", "v1", 1, [], "r1")], [line("g1", "v1", 1, [], "r2")]);
    expect(otherRelease.dropped).toEqual(["g1"]);
  });

  it("moves a release line the user does not have, keeping its release", () => {
    const plan = planCartMerge([line("u1", "v1")], [line("g1", "v2", 1, [], "r1")]);
    expect(plan.moves).toEqual(["g1"]);
  });

  it("merges a matching variant even when the cart is full", () => {
    const userLines = Array.from({ length: CART_MAX_LINES }, (_, index) => line(`u${index}`, `v${index}`));
    const plan = planCartMerge(userLines, [line("g1", "v0", 1)]);
    expect(plan.updates).toHaveLength(1);
    expect(plan.dropped).toEqual([]);
  });
});
