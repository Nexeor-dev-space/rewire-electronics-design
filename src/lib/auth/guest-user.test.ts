import { describe, expect, it } from "vitest";
import { accountForSignUp, upgradeData } from "./guest-user";

interface Row {
  id: string;
  email: string;
  fullName: string;
  isGuest: boolean;
  state: "ACTIVE" | "INACTIVE";
  role: "CUSTOMER" | "STAFF" | "ADMIN";
}

const shadow: Row = { id: "u1", email: "guest@example.com", fullName: "Old Name", isGuest: true, state: "ACTIVE", role: "CUSTOMER" };
const registered: Row = { ...shadow, isGuest: false };
const inactiveShadow: Row = { ...shadow, state: "INACTIVE" };
const promotedGuest: Row = { ...shadow, role: "STAFF" };

describe("accountForSignUp", () => {
  it("creates when no account has the email", () => {
    expect(accountForSignUp(null)).toBe("create");
  });

  it("upgrades a shadow row", () => {
    expect(accountForSignUp(shadow)).toBe("upgrade");
  });

  it("conflicts on a registered or inactive account", () => {
    expect(accountForSignUp(registered)).toBe("conflict");
    expect(accountForSignUp(inactiveShadow)).toBe("conflict");
    expect(accountForSignUp(promotedGuest)).toBe("conflict");
  });
});

describe("upgradeData", () => {
  it("claims the row and clears the checkout phone when none is given", () => {
    const data = upgradeData({ fullName: "Sara Ali", phone: null }, "hash");
    expect(data).toEqual({
      fullName: "Sara Ali",
      phone: null,
      passwordHash: "hash",
      isGuest: false,
      emailVerifiedAt: null,
      sessionVersion: { increment: 1 },
    });
  });

  it("keeps the phone given at sign-up", () => {
    expect(upgradeData({ fullName: "Sara Ali", phone: "+971501234567" }, "hash").phone).toBe(
      "+971501234567",
    );
  });
});
