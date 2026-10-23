import { describe, expect, it } from "vitest";
import { addOnSchema } from "./add-on.validator";

const addOn = { name: "Extend warranty to 24 months", kind: "PROTECTION", price: 24900, appliesToAll: true };

describe("addOnSchema extra warranty months", () => {
  it("defaults to none", () => {
    expect(addOnSchema.parse(addOn).extraWarrantyMonths).toBe(0);
  });

  it("accepts months on a protection add-on", () => {
    expect(addOnSchema.parse({ ...addOn, extraWarrantyMonths: 12 }).extraWarrantyMonths).toBe(12);
  });

  it("refuses months on any other kind", () => {
    const result = addOnSchema.safeParse({ ...addOn, kind: "ACCESSORY", extraWarrantyMonths: 6 });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(["extraWarrantyMonths"]);
  });

  it("refuses a fraction or a negative", () => {
    expect(addOnSchema.safeParse({ ...addOn, extraWarrantyMonths: 1.5 }).success).toBe(false);
    expect(addOnSchema.safeParse({ ...addOn, extraWarrantyMonths: -1 }).success).toBe(false);
  });
});
