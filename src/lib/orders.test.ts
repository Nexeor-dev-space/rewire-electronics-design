import { describe, expect, it } from "vitest";
import { MS_PER_DAY } from "@/lib/constants";
import {
  ORDER_STATUSES,
  PAYMENT_LINK_NOTICE,
  accountOrdersWhere,
  initialStatus,
  nextStatuses,
  orderTimeline,
  paymentActions,
  returnableUntil,
  type OrderStatus,
} from "./orders";

const EXPECTED_MOVES: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["DISPATCHED", "CANCELLED"],
  DISPATCHED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

describe("nextStatuses", () => {
  it("follows the transition matrix for a paid order", () => {
    for (const from of ORDER_STATUSES) {
      for (const to of ORDER_STATUSES) {
        const allowed = nextStatuses({ status: from, paymentStatus: "PAID" }).includes(to);
        expect(allowed, `${from} -> ${to}`).toBe(EXPECTED_MOVES[from].includes(to));
      }
    }
  });

  it("needs PAID before an order is confirmed", () => {
    expect(nextStatuses({ status: "PENDING_PAYMENT", paymentStatus: "UNPAID" })).toEqual(["CANCELLED"]);
    expect(nextStatuses({ status: "PENDING_PAYMENT", paymentStatus: "PAID" })).toContain("CONFIRMED");
  });

  it("refuses to cancel after dispatch", () => {
    expect(nextStatuses({ status: "DISPATCHED", paymentStatus: "PAID" })).not.toContain("CANCELLED");
  });
});

describe("initialStatus", () => {
  it("confirms cash on delivery and holds card and Apple Pay for payment", () => {
    expect(initialStatus("COD")).toBe("CONFIRMED");
    expect(initialStatus("CARD")).toBe("PENDING_PAYMENT");
    expect(initialStatus("APPLE_PAY")).toBe("PENDING_PAYMENT");
  });
});

describe("paymentActions", () => {
  it("lets an unpaid order be marked paid unless it is cancelled", () => {
    expect(paymentActions({ status: "CONFIRMED", paymentStatus: "UNPAID", refundedAmount: 0 })).toEqual(["PAID"]);
    expect(paymentActions({ status: "CANCELLED", paymentStatus: "UNPAID", refundedAmount: 0 })).toEqual([]);
  });

  it("lets a paid order go back to unpaid only while nothing was refunded", () => {
    expect(paymentActions({ status: "CONFIRMED", paymentStatus: "PAID", refundedAmount: 0 })).toEqual(["UNPAID"]);
    expect(paymentActions({ status: "CONFIRMED", paymentStatus: "PAID", refundedAmount: 500 })).toEqual([]);
  });

  it("refunds only a cancelled paid order", () => {
    expect(paymentActions({ status: "CANCELLED", paymentStatus: "PAID", refundedAmount: 0 })).toEqual([
      "UNPAID",
      "REFUNDED",
    ]);
    expect(paymentActions({ status: "DELIVERED", paymentStatus: "PAID", refundedAmount: 0 })).not.toContain(
      "REFUNDED",
    );
  });

  it("offers nothing on refunded orders", () => {
    expect(paymentActions({ status: "CANCELLED", paymentStatus: "REFUNDED", refundedAmount: 100 })).toEqual([]);
    expect(
      paymentActions({ status: "DELIVERED", paymentStatus: "PARTIALLY_REFUNDED", refundedAmount: 100 }),
    ).toEqual([]);
  });
});

describe("returnableUntil", () => {
  it("adds the window in days to the delivery time", () => {
    const deliveredAt = new Date("2026-10-01T12:00:00.000Z");
    expect(returnableUntil(deliveredAt, 30).getTime()).toBe(deliveredAt.getTime() + 30 * MS_PER_DAY);
  });
});

describe("accountOrdersWhere", () => {
  it("hides orders placed as a guest until the email is verified", () => {
    expect(accountOrdersWhere({ id: "u1", emailVerified: false })).toEqual({
      userId: "u1",
      placedAsGuest: false,
    });
  });

  it("shows every order of a verified account", () => {
    expect(accountOrdersWhere({ id: "u1", emailVerified: true })).toEqual({ userId: "u1" });
  });
});

describe("orderTimeline", () => {
  const placedAt = new Date("2026-10-01T09:00:00.000Z");
  const at = (minutes: number) => new Date(placedAt.getTime() + minutes * 60_000);

  it("marks the steps reached and the current one", () => {
    const steps = orderTimeline(
      "PROCESSING",
      [
        { status: "CONFIRMED", note: "", createdAt: at(0) },
        { status: "PROCESSING", note: "Packing", createdAt: at(30) },
      ],
      placedAt,
    );

    expect(steps.map((step) => step.key)).toEqual(["PLACED", "CONFIRMED", "PROCESSING", "DISPATCHED", "DELIVERED"]);
    expect(steps.map((step) => step.reached)).toEqual([true, true, true, false, false]);
    expect(steps.find((step) => step.current)?.key).toBe("PROCESSING");
    expect(steps[2]).toMatchObject({ at: at(30).toISOString(), note: "Packing" });
    expect(steps[3].at).toBeNull();
  });

  it("uses the first event of each status", () => {
    const steps = orderTimeline(
      "CONFIRMED",
      [
        { status: "PENDING_PAYMENT", note: "", createdAt: at(0) },
        { status: "CONFIRMED", note: "Payment received", createdAt: at(10) },
        { status: "CONFIRMED", note: "Payment marked paid", createdAt: at(20) },
      ],
      placedAt,
    );
    expect(steps[1]).toMatchObject({ at: at(10).toISOString(), note: "Payment received", current: true });
  });

  it("shows Confirmed with the payment link notice while awaiting payment", () => {
    const steps = orderTimeline("PENDING_PAYMENT", [{ status: "PENDING_PAYMENT", note: "", createdAt: at(0) }], placedAt);
    expect(steps[1]).toMatchObject({ key: "CONFIRMED", reached: false, note: PAYMENT_LINK_NOTICE });
    expect(steps.find((step) => step.current)?.key).toBe("PLACED");
  });

  it("shows the reached steps then Cancelled", () => {
    const steps = orderTimeline(
      "CANCELLED",
      [
        { status: "CONFIRMED", note: "", createdAt: at(0) },
        { status: "PROCESSING", note: "", createdAt: at(10) },
        { status: "CANCELLED", note: "Out of stock", createdAt: at(20) },
      ],
      placedAt,
    );
    expect(steps.map((step) => step.key)).toEqual(["PLACED", "CONFIRMED", "PROCESSING", "CANCELLED"]);
    expect(steps[3]).toMatchObject({ current: true, note: "Out of stock", at: at(20).toISOString() });
  });

  it("starts with Placed at the order time", () => {
    const [placed] = orderTimeline("CONFIRMED", [], placedAt);
    expect(placed).toMatchObject({ key: "PLACED", reached: true, at: placedAt.toISOString() });
  });
});
