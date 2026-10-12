import { describe, expect, it } from "vitest";
import { RETURN_DETAIL_MIN_LENGTH, RETURN_WINDOW_MAX_DAYS } from "@/lib/constants";
import {
  createReturnSchema,
  recordRefundSchema,
  returnNumberValidator,
  returnStatusChangeSchema,
  storeSettingsSchema,
} from "./return.validator";

const base = {
  orderNumber: "rw-00000001",
  items: [{ orderItemId: "item_1", quantity: 1 }],
  reason: "CHANGED_MIND",
};

function fieldErrors(input: unknown) {
  const result = createReturnSchema.safeParse(input);
  if (result.success) return {};
  return Object.fromEntries(result.error.issues.map((issue) => [issue.path.join("."), issue.message]));
}

describe("createReturnSchema", () => {
  it("uppercases the order number and defaults the detail", () => {
    expect(createReturnSchema.parse(base)).toMatchObject({ orderNumber: "RW-00000001", detail: "" });
  });

  it("needs detail for not as described, arrived damaged and battery issue", () => {
    for (const reason of ["NOT_AS_DESCRIBED", "ARRIVED_DAMAGED", "BATTERY_ISSUE"]) {
      expect(fieldErrors({ ...base, reason }), reason).toHaveProperty("detail");
      expect(fieldErrors({ ...base, reason, detail: "x".repeat(RETURN_DETAIL_MIN_LENGTH) }), reason).toEqual({});
    }
  });

  it("does not need detail for changed mind and wrong item", () => {
    expect(fieldErrors(base)).toEqual({});
    expect(fieldErrors({ ...base, reason: "WRONG_ITEM" })).toEqual({});
  });

  it("reports an unknown reason without throwing", () => {
    expect(fieldErrors({ ...base, reason: "OTHER" })).toHaveProperty("reason");
  });

  it("refuses the same item twice", () => {
    const items = [
      { orderItemId: "item_1", quantity: 1 },
      { orderItemId: "item_1", quantity: 1 },
    ];
    expect(fieldErrors({ ...base, items })).toHaveProperty("items");
  });

  it("refuses no items and a zero quantity", () => {
    expect(fieldErrors({ ...base, items: [] })).toHaveProperty("items");
    expect(fieldErrors({ ...base, items: [{ orderItemId: "item_1", quantity: 0 }] })).toHaveProperty(
      "items.0.quantity",
    );
  });
});

describe("returnNumberValidator", () => {
  it("accepts RT- and 8 digits in any case", () => {
    expect(returnNumberValidator.parse(" rt-12345678 ")).toBe("RT-12345678");
    expect(returnNumberValidator.safeParse("RW-12345678").success).toBe(false);
    expect(returnNumberValidator.safeParse("RT-1234").success).toBe(false);
  });
});

describe("returnStatusChangeSchema", () => {
  it("never accepts REFUNDED", () => {
    expect(returnStatusChangeSchema.safeParse({ status: "REFUNDED" }).success).toBe(false);
    expect(returnStatusChangeSchema.parse({ status: "APPROVED" })).toEqual({ status: "APPROVED", note: "" });
  });
});

describe("storeSettingsSchema", () => {
  it("accepts 0 to the maximum window", () => {
    expect(storeSettingsSchema.safeParse({ returnWindowDays: 0 }).success).toBe(true);
    expect(storeSettingsSchema.safeParse({ returnWindowDays: RETURN_WINDOW_MAX_DAYS }).success).toBe(true);
  });

  it("refuses negative, too long and fractional windows", () => {
    expect(storeSettingsSchema.safeParse({ returnWindowDays: -1 }).success).toBe(false);
    expect(storeSettingsSchema.safeParse({ returnWindowDays: RETURN_WINDOW_MAX_DAYS + 1 }).success).toBe(false);
    expect(storeSettingsSchema.safeParse({ returnWindowDays: 1.5 }).success).toBe(false);
  });
});

describe("recordRefundSchema", () => {
  const refund = { amount: 1, reference: "TXN-1" };

  it("needs an amount of at least 1 minor unit", () => {
    expect(recordRefundSchema.safeParse(refund).success).toBe(true);
    expect(recordRefundSchema.safeParse({ ...refund, amount: 0 }).success).toBe(false);
    expect(recordRefundSchema.safeParse({ ...refund, amount: 1.5 }).success).toBe(false);
  });

  it("needs a reference", () => {
    expect(recordRefundSchema.safeParse({ ...refund, reference: "  " }).success).toBe(false);
  });
});
