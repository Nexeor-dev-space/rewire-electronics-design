import { describe, expect, it } from "vitest";
import {
  SECTION_RULES,
  checkItemFields,
  checkSectionFields,
  isWithinSchedule,
  type SectionFieldsInput,
  type SectionItemFieldsInput,
} from "./homepage-sections";

const START = "2026-11-01T00:00:00Z";
const END = "2026-11-30T00:00:00Z";

function item(fields: Partial<SectionItemFieldsInput> = {}): SectionItemFieldsInput {
  return {
    visible: true,
    productId: null,
    categoryId: null,
    title: null,
    body: null,
    author: null,
    rating: null,
    releaseAt: null,
    ctaLabel: null,
    ctaHref: null,
    imageId: null,
    ...fields,
  };
}

function section(fields: Partial<SectionFieldsInput> = {}): SectionFieldsInput {
  return {
    eyebrow: null,
    title: "Deals",
    subtitle: null,
    description: null,
    ctaLabel: null,
    ctaHref: null,
    imageId: null,
    mobileImageId: null,
    seasonal: false,
    startsAt: null,
    endsAt: null,
    refIds: [],
    items: [],
    ...fields,
  };
}

describe("deal items", () => {
  it("accepts a product on its own", () => {
    expect(checkItemFields("deals", item({ productId: "p1" }))).toEqual({});
  });

  it("refuses copied product data on a product deal", () => {
    const errors = checkItemFields(
      "deals",
      item({ productId: "p1", title: "Name", imageId: "m1", ctaHref: "/x" }),
    );
    expect(Object.keys(errors).sort()).toEqual(["ctaHref", "imageId", "title"]);
  });

  it("needs a title, image and link for a promo tile", () => {
    expect(Object.keys(checkItemFields("deals", item())).sort()).toEqual([
      "ctaHref",
      "imageId",
      "title",
    ]);
    expect(
      checkItemFields("deals", item({ title: "Gift guide", imageId: "m1", ctaHref: "/collection" })),
    ).toEqual({});
  });
});

describe("season deals schedule", () => {
  it("needs both dates", () => {
    const errors = checkSectionFields("SEASON_DEALS", section());
    expect(errors).toHaveProperty("startsAt");
    expect(errors).toHaveProperty("endsAt");
  });

  it("needs the end after the start", () => {
    expect(checkSectionFields("SEASON_DEALS", section({ startsAt: END, endsAt: START }))).toHaveProperty(
      "endsAt",
    );
    expect(checkSectionFields("SEASON_DEALS", section({ startsAt: START, endsAt: END }))).toEqual({});
  });

  it("refuses dates on a type without a schedule", () => {
    const errors = checkSectionFields("BEST_DEALS", section({ startsAt: START, endsAt: END }));
    expect(errors).toHaveProperty("startsAt");
    expect(errors).toHaveProperty("endsAt");
  });

  it("is live from the start up to, not including, the end", () => {
    const start = new Date(START);
    const end = new Date(END);
    expect(isWithinSchedule(start, end, start)).toBe(true);
    expect(isWithinSchedule(start, end, end)).toBe(false);
    expect(isWithinSchedule(start, end, new Date("2026-10-31T23:59:59Z"))).toBe(false);
    expect(isWithinSchedule(null, end, start)).toBe(false);
  });
});

describe("deal sections", () => {
  it("allows one of each on the homepage", () => {
    expect(SECTION_RULES.BEST_DEALS.singleton).toBe(true);
    expect(SECTION_RULES.SEASON_DEALS.singleton).toBe(true);
  });

  it("refuses the same product twice", () => {
    const errors = checkSectionFields(
      "BEST_DEALS",
      section({ items: [item({ productId: "p1" }), item({ productId: "p1" })] }),
    );
    expect(errors).toHaveProperty("items");
  });
});
