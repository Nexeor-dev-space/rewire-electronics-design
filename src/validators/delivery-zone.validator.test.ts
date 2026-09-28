import { describe, expect, it } from "vitest";
import { deliveryZoneParamsSchema, deliveryZoneSchema } from "./delivery-zone.validator";

const zone = {
  standardFee: 0,
  expressFee: 35_00,
  standardMinDays: 2,
  standardMaxDays: 4,
  expressMinDays: 1,
  expressMaxDays: 2,
};

function errorPaths(input: unknown) {
  const result = deliveryZoneSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join("."));
}

describe("deliveryZoneSchema", () => {
  it("accepts a valid zone and equal min and max", () => {
    expect(errorPaths(zone)).toEqual([]);
    expect(errorPaths({ ...zone, expressMinDays: 1, expressMaxDays: 1 })).toEqual([]);
  });

  it("rejects negative or fractional fees", () => {
    expect(errorPaths({ ...zone, standardFee: -1 })).toEqual(["standardFee"]);
    expect(errorPaths({ ...zone, expressFee: 35.5 })).toEqual(["expressFee"]);
  });

  it("bounds the days", () => {
    expect(errorPaths({ ...zone, standardMinDays: -1 })).toEqual(["standardMinDays"]);
    expect(errorPaths({ ...zone, standardMaxDays: 31 })).toEqual(["standardMaxDays"]);
  });

  it("puts a min above max on the max field of that method", () => {
    expect(errorPaths({ ...zone, standardMinDays: 5 })).toEqual(["standardMaxDays"]);
    expect(errorPaths({ ...zone, expressMinDays: 3 })).toEqual(["expressMaxDays"]);
  });
});

describe("deliveryZoneParamsSchema", () => {
  it("accepts only the seven emirates", () => {
    expect(deliveryZoneParamsSchema.safeParse({ emirate: "DUBAI" }).success).toBe(true);
    expect(deliveryZoneParamsSchema.safeParse({ emirate: "dubai" }).success).toBe(false);
    expect(deliveryZoneParamsSchema.safeParse({ emirate: "DOHA" }).success).toBe(false);
  });
});
