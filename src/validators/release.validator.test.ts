import { describe, expect, it } from "vitest";
import { RELEASE_TITLE_MAX_LENGTH } from "@/lib/constants";
import { releaseSchema } from "@/validators/release.validator";

const valid = {
  title: "Drop 005 Signal Edit",
  productId: "prod_1",
  startsAt: "2026-11-01T14:00:00.000Z",
  endsAt: "2026-11-08T14:00:00.000Z",
};

describe("releaseSchema", () => {
  it("accepts a release with and without an end", () => {
    expect(releaseSchema.safeParse(valid).success).toBe(true);
    expect(releaseSchema.safeParse({ ...valid, endsAt: null }).success).toBe(true);
  });

  it("defaults to active", () => {
    expect(releaseSchema.parse(valid).active).toBe(true);
  });

  it.each([
    ["an empty title", { title: "  " }],
    ["a long title", { title: "x".repeat(RELEASE_TITLE_MAX_LENGTH + 1) }],
    ["no product", { productId: "" }],
    ["no start", { startsAt: null }],
    ["an end before the start", { endsAt: "2026-10-31T14:00:00.000Z" }],
    ["an end equal to the start", { endsAt: valid.startsAt }],
  ])("rejects %s", (_label, override) => {
    expect(releaseSchema.safeParse({ ...valid, ...override }).success).toBe(false);
  });
});
