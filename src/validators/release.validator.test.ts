import { describe, expect, it } from "vitest";
import {
  RELEASE_ALLOCATIONS_MAX,
  RELEASE_MAX_PER_CUSTOMER_LIMIT,
  RELEASE_TITLE_MAX_LENGTH,
} from "@/lib/constants";
import {
  releaseAllocationsSchema,
  releaseListQuerySchema,
  releaseSchema,
  releaseStateSchema,
} from "@/validators/release.validator";

const valid = {
  title: "Drop 005 Signal Edit",
  edition: "Edition 05",
  startsAt: "2026-11-01T14:00:00.000Z",
  endsAt: "2026-11-08T14:00:00.000Z",
  maxPerCustomer: 1,
};

describe("releaseSchema", () => {
  it("accepts a release with and without an end, defaulting text and hidden", () => {
    expect(releaseSchema.safeParse(valid).success).toBe(true);
    expect(releaseSchema.safeParse({ ...valid, endsAt: null }).success).toBe(true);
    const parsed = releaseSchema.parse({ title: "x", startsAt: valid.startsAt, maxPerCustomer: 2 });
    expect(parsed).toMatchObject({ edition: "", description: "", hidden: false, endsAt: null });
  });

  it.each([
    ["an empty title", { title: "  " }],
    ["a long title", { title: "x".repeat(RELEASE_TITLE_MAX_LENGTH + 1) }],
    ["no start", { startsAt: null }],
    ["an end before the start", { endsAt: "2026-10-31T14:00:00.000Z" }],
    ["an end equal to the start", { endsAt: valid.startsAt }],
    ["a zero cap", { maxPerCustomer: 0 }],
    ["a cap over the limit", { maxPerCustomer: RELEASE_MAX_PER_CUSTOMER_LIMIT + 1 }],
    ["a fractional cap", { maxPerCustomer: 1.5 }],
  ])("rejects %s", (_label, override) => {
    expect(releaseSchema.safeParse({ ...valid, ...override }).success).toBe(false);
  });
});

describe("releaseListQuerySchema", () => {
  it("defaults the sort and accepts a status", () => {
    expect(releaseListQuerySchema.parse({}).sort).toBe("opens_desc");
    expect(releaseListQuerySchema.parse({ status: "SOLD_OUT", sort: "opens_asc" })).toMatchObject({
      status: "SOLD_OUT",
      sort: "opens_asc",
    });
  });

  it("rejects an unknown status or sort", () => {
    expect(releaseListQuerySchema.safeParse({ status: "OFF" }).success).toBe(false);
    expect(releaseListQuerySchema.safeParse({ sort: "title" }).success).toBe(false);
  });
});

describe("releaseStateSchema", () => {
  it("accepts the three actions only", () => {
    for (const action of ["PUBLISH", "UNPUBLISH", "END"]) {
      expect(releaseStateSchema.safeParse({ action }).success).toBe(true);
    }
    expect(releaseStateSchema.safeParse({ action: "DELETE" }).success).toBe(false);
  });
});

describe("releaseAllocationsSchema", () => {
  it("accepts an empty or full list with zero units", () => {
    expect(releaseAllocationsSchema.safeParse({ allocations: [] }).success).toBe(true);
    expect(releaseAllocationsSchema.safeParse({ allocations: [{ variantId: "v1", allocated: 0 }] }).success).toBe(true);
  });

  it.each([
    ["negative units", [{ variantId: "v1", allocated: -1 }]],
    ["a repeated variant", [{ variantId: "v1", allocated: 1 }, { variantId: "v1", allocated: 2 }]],
    ["too many rows", Array.from({ length: RELEASE_ALLOCATIONS_MAX + 1 }, (_, i) => ({ variantId: `v${i}`, allocated: 1 }))],
  ])("rejects %s", (_label, allocations) => {
    expect(releaseAllocationsSchema.safeParse({ allocations }).success).toBe(false);
  });
});
