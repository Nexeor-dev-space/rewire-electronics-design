import { describe, expect, it } from "vitest";
import { addCartItemSchema } from "./cart.validator";

describe("addCartItemSchema", () => {
  it("adds from the shop without a release", () => {
    const parsed = addCartItemSchema.parse({ variantId: "v1" });
    expect(parsed).toEqual({ variantId: "v1", quantity: 1, addOnIds: [] });
    expect(parsed.releaseId).toBeUndefined();
  });

  it("carries the release a line is bought from", () => {
    expect(addCartItemSchema.parse({ variantId: "v1", releaseId: "r1", quantity: 2 })).toMatchObject({
      variantId: "v1",
      releaseId: "r1",
      quantity: 2,
    });
  });

  it.each([
    ["an empty release id", { variantId: "v1", releaseId: "" }],
    ["a non string release id", { variantId: "v1", releaseId: 5 }],
    ["a null release id", { variantId: "v1", releaseId: null }],
  ])("rejects %s", (_label, input) => {
    expect(addCartItemSchema.safeParse(input).success).toBe(false);
  });
});
