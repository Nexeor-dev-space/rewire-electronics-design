import { describe, expect, it } from "vitest";
import { MS_PER_DAY } from "@/lib/constants";
import { PAYMENT_STATUSES, type PaymentStatus } from "@/lib/orders";
import {
  RETURN_STATUSES,
  canRefund,
  checkReturnItems,
  isReturnable,
  nextReturnStatuses,
  paymentStatusAfterRefund,
  refundableAmount,
  returnableQuantity,
  suggestedRefund,
  type ReturnStatus,
} from "./returns";

const NOW = new Date("2026-10-07T12:00:00.000Z");
const LATER = new Date(NOW.getTime() + MS_PER_DAY);
const EARLIER = new Date(NOW.getTime() - MS_PER_DAY);

const EXPECTED_MOVES: Record<ReturnStatus, ReturnStatus[]> = {
  REQUESTED: ["APPROVED", "DECLINED"],
  APPROVED: ["IN_TRANSIT", "RECEIVED", "DECLINED"],
  DECLINED: [],
  IN_TRANSIT: ["RECEIVED"],
  RECEIVED: ["INSPECTING", "DECLINED"],
  INSPECTING: ["DECLINED"],
  REFUNDED: [],
};

describe("isReturnable", () => {
  it("needs a stored returnableUntil", () => {
    expect(isReturnable({ status: "DELIVERED", returnableUntil: null }, NOW)).toBe(false);
  });

  it("is open inside the window", () => {
    expect(isReturnable({ status: "DELIVERED", returnableUntil: LATER }, NOW)).toBe(true);
    expect(isReturnable({ status: "DELIVERED", returnableUntil: LATER.toISOString() }, NOW)).toBe(true);
  });

  it("is closed at exactly returnableUntil and after it", () => {
    expect(isReturnable({ status: "DELIVERED", returnableUntil: NOW }, NOW)).toBe(false);
    expect(isReturnable({ status: "DELIVERED", returnableUntil: EARLIER }, NOW)).toBe(false);
  });

  it("is closed for an order that isn't delivered", () => {
    expect(isReturnable({ status: "DISPATCHED", returnableUntil: LATER }, NOW)).toBe(false);
    expect(isReturnable({ status: "CANCELLED", returnableUntil: LATER }, NOW)).toBe(false);
  });
});

describe("returnableQuantity", () => {
  it("subtracts what is already returned and never goes below 0", () => {
    expect(returnableQuantity(3, 0)).toBe(3);
    expect(returnableQuantity(3, 2)).toBe(1);
    expect(returnableQuantity(3, 5)).toBe(0);
  });

  it("counts only the returns the caller passes in, so declined returns free their quantity", () => {
    const returns = [
      { status: "DECLINED" as ReturnStatus, quantity: 2 },
      { status: "REQUESTED" as ReturnStatus, quantity: 1 },
    ];
    const held = returns.filter((entry) => entry.status !== "DECLINED").reduce((sum, entry) => sum + entry.quantity, 0);
    expect(returnableQuantity(3, held)).toBe(2);
  });
});

describe("checkReturnItems", () => {
  const lines = [
    { orderItemId: "a", returnableQuantity: 2 },
    { orderItemId: "b", returnableQuantity: 0 },
  ];

  it("accepts items within what is returnable", () => {
    expect(checkReturnItems(lines, [{ orderItemId: "a", quantity: 2 }])).toBeNull();
  });

  it("refuses an item that isn't on the order", () => {
    expect(checkReturnItems(lines, [{ orderItemId: "x", quantity: 1 }])).toHaveProperty(["items.0.orderItemId"]);
  });

  it("refuses the same item twice", () => {
    const errors = checkReturnItems(lines, [
      { orderItemId: "a", quantity: 1 },
      { orderItemId: "a", quantity: 1 },
    ]);
    expect(errors).toHaveProperty(["items.1.orderItemId"]);
    expect(errors).not.toHaveProperty(["items.0.orderItemId"]);
  });

  it("refuses a zero quantity", () => {
    expect(checkReturnItems(lines, [{ orderItemId: "a", quantity: 0 }])).toHaveProperty(["items.0.quantity"]);
  });

  it("refuses more than is returnable and names the limit", () => {
    expect(checkReturnItems(lines, [{ orderItemId: "a", quantity: 3 }])).toEqual({
      "items.0.quantity": ["Only 2 can be returned."],
    });
    expect(checkReturnItems(lines, [{ orderItemId: "b", quantity: 1 }])).toHaveProperty(["items.0.quantity"]);
  });
});

describe("nextReturnStatuses", () => {
  it("follows the transition matrix", () => {
    for (const from of RETURN_STATUSES) {
      for (const to of RETURN_STATUSES) {
        expect(nextReturnStatuses(from).includes(to), `${from} -> ${to}`).toBe(EXPECTED_MOVES[from].includes(to));
      }
    }
  });

  it("never offers REFUNDED", () => {
    for (const from of RETURN_STATUSES) expect(nextReturnStatuses(from)).not.toContain("REFUNDED");
  });
});

describe("canRefund", () => {
  it("allows only received and inspecting returns", () => {
    const allowed = RETURN_STATUSES.filter(canRefund);
    expect(allowed).toEqual(["RECEIVED", "INSPECTING"]);
  });
});

describe("refundableAmount", () => {
  const expected: Record<PaymentStatus, number> = {
    UNPAID: 0,
    PAID: 7000,
    PARTIALLY_REFUNDED: 7000,
    REFUNDED: 0,
  };

  it("is total less refunded only when money was taken", () => {
    for (const paymentStatus of PAYMENT_STATUSES) {
      expect(refundableAmount({ total: 10000, refundedAmount: 3000, paymentStatus }), paymentStatus).toBe(
        expected[paymentStatus],
      );
    }
  });

  it("is never negative", () => {
    expect(refundableAmount({ total: 1000, refundedAmount: 2000, paymentStatus: "PAID" })).toBe(0);
  });
});

describe("suggestedRefund", () => {
  const paid = { total: 0, refundedAmount: 0, paymentStatus: "PAID" as PaymentStatus };

  it("refunds the lines in full without a discount", () => {
    const order = { ...paid, subtotal: 30000, discount: 0, total: 32500 };
    expect(suggestedRefund(order, [{ unitPrice: 10000, addOnUnitPrice: 500, quantity: 2 }])).toBe(21000);
  });

  it("spreads a discount over the lines and rounds", () => {
    const order = { ...paid, subtotal: 30000, discount: 1000, total: 29000 };
    expect(suggestedRefund(order, [{ unitPrice: 10000, addOnUnitPrice: 0, quantity: 1 }])).toBe(9667);
  });

  it("suggests 0 for a 100% discount or a zero subtotal", () => {
    const free = { ...paid, subtotal: 30000, discount: 30000, total: 2500 };
    expect(suggestedRefund(free, [{ unitPrice: 10000, addOnUnitPrice: 0, quantity: 1 }])).toBe(0);
    const empty = { ...paid, subtotal: 0, discount: 0, total: 0 };
    expect(suggestedRefund(empty, [{ unitPrice: 10000, addOnUnitPrice: 0, quantity: 1 }])).toBe(0);
  });

  it("is capped at what is still refundable", () => {
    const order = { ...paid, subtotal: 30000, discount: 0, total: 30000, refundedAmount: 25000 };
    expect(suggestedRefund(order, [{ unitPrice: 10000, addOnUnitPrice: 0, quantity: 1 }])).toBe(5000);
  });
});

describe("paymentStatusAfterRefund", () => {
  it("is partial until the whole total is refunded", () => {
    expect(paymentStatusAfterRefund(10000, 4000)).toBe("PARTIALLY_REFUNDED");
    expect(paymentStatusAfterRefund(10000, 10000)).toBe("REFUNDED");
  });
});
