import { describe, expect, it } from "vitest";
import { vatSettingsSchema } from "@/validators/vat.validator";

describe("vatSettingsSchema", () => {
  it.each([0, 5, 15, 100])("accepts %i", (vatRatePercent) => {
    expect(vatSettingsSchema.safeParse({ vatRatePercent }).success).toBe(true);
  });

  it.each([-1, 101, 7.5, Number.NaN])("rejects %s", (vatRatePercent) => {
    expect(vatSettingsSchema.safeParse({ vatRatePercent }).success).toBe(false);
  });

  it("rejects a missing or non numeric rate", () => {
    expect(vatSettingsSchema.safeParse({}).success).toBe(false);
    expect(vatSettingsSchema.safeParse({ vatRatePercent: "5" }).success).toBe(false);
  });
});
