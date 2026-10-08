import { describe, expect, it } from "vitest";
import {
  fulfilmentUpdateSchema,
  orderNumberValidator,
  orderPaymentSchema,
  trackOrderSchema,
  updateOrderSchema,
} from "./order.validator";

describe("orderNumberValidator", () => {
  it("trims and uppercases the number", () => {
    expect(orderNumberValidator.parse("  rw-00001234 ")).toBe("RW-00001234");
  });

  it("refuses a number of the wrong shape", () => {
    expect(orderNumberValidator.safeParse("RW-1234").success).toBe(false);
    expect(orderNumberValidator.safeParse("XX-12345678").success).toBe(false);
    expect(orderNumberValidator.safeParse("").success).toBe(false);
  });
});

describe("trackOrderSchema", () => {
  it("normalises the number and the email", () => {
    expect(trackOrderSchema.parse({ number: "rw-12345678", email: " Guest@Example.com " })).toEqual({
      number: "RW-12345678",
      email: "guest@example.com",
    });
  });
});

describe("orderPaymentSchema", () => {
  it("accepts only the statuses staff set by hand", () => {
    expect(orderPaymentSchema.safeParse({ paymentStatus: "PAID" }).success).toBe(true);
    expect(orderPaymentSchema.safeParse({ paymentStatus: "PARTIALLY_REFUNDED" }).success).toBe(false);
  });
});

describe("update schemas", () => {
  it("need at least one field", () => {
    expect(updateOrderSchema.safeParse({}).success).toBe(false);
    expect(updateOrderSchema.safeParse({ staffNote: "Called the customer" }).success).toBe(true);
    expect(fulfilmentUpdateSchema.safeParse({}).success).toBe(false);
    expect(fulfilmentUpdateSchema.safeParse({ status: "DISPATCHED" }).success).toBe(true);
  });

  it("refuses a fulfilment move outside the queue", () => {
    expect(fulfilmentUpdateSchema.safeParse({ status: "CANCELLED" }).success).toBe(false);
  });
});
