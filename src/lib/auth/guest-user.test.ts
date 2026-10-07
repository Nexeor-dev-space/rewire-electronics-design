import { describe, expect, it, vi } from "vitest";
import type { Prisma } from "@/generated/prisma/client";
import { ServiceError } from "@/lib/api/api-response";
import {
  MESSAGE_GUEST_EMAIL_REGISTERED,
  accountForSignUp,
  resolveGuestUser,
  upgradeData,
} from "./guest-user";

interface Row {
  id: string;
  email: string;
  fullName: string;
  isGuest: boolean;
  state: "ACTIVE" | "INACTIVE";
  role: "CUSTOMER" | "STAFF" | "ADMIN";
}

const contact = { email: "guest@example.com", fullName: "Sara Ali", phone: "+971501234567" };

function stubTx({ created, found, refreshed = 1 }: { created: number; found: Row | null; refreshed?: number }) {
  const user = {
    createMany: vi.fn().mockResolvedValue({ count: created }),
    findUnique: vi.fn().mockResolvedValue(found),
    updateMany: vi.fn().mockResolvedValue({ count: refreshed }),
  };
  return { tx: { user } as unknown as Prisma.TransactionClient, user };
}

const shadow: Row = { id: "u1", email: contact.email, fullName: "Old Name", isGuest: true, state: "ACTIVE", role: "CUSTOMER" };
const registered: Row = { ...shadow, isGuest: false };
const inactiveShadow: Row = { ...shadow, state: "INACTIVE" };
const promotedGuest: Row = { ...shadow, role: "STAFF" };

async function conflictOf(promise: Promise<unknown>) {
  const error = await promise.then(
    () => null,
    (caught: unknown) => caught,
  );
  expect(error).toBeInstanceOf(ServiceError);
  return error as ServiceError;
}

describe("resolveGuestUser", () => {
  it("creates a shadow row and returns it", async () => {
    const created = { ...shadow, fullName: contact.fullName };
    const { tx, user } = stubTx({ created: 1, found: created });

    const result = await resolveGuestUser(tx, contact);

    expect(result).toEqual(created);
    const [args] = user.createMany.mock.calls[0];
    expect(args.skipDuplicates).toBe(true);
    expect(args.data[0]).toMatchObject({
      email: contact.email,
      isGuest: true,
      passwordHash: null,
      emailVerifiedAt: null,
      role: "CUSTOMER",
    });
    expect(user.updateMany).not.toHaveBeenCalled();
  });

  it("reuses an existing shadow row and refreshes name and phone", async () => {
    const { tx, user } = stubTx({ created: 0, found: shadow });

    const result = await resolveGuestUser(tx, contact);

    expect(result.fullName).toBe(contact.fullName);
    expect(user.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: shadow.id, isGuest: true, state: "ACTIVE", role: "CUSTOMER" },
        data: { fullName: contact.fullName, phone: contact.phone },
      }),
    );
  });

  it("refuses a registered account with a 409 on the email", async () => {
    const { tx, user } = stubTx({ created: 0, found: registered });

    const error = await conflictOf(resolveGuestUser(tx, contact));

    expect(error.status).toBe(409);
    expect(error.message).toBe(MESSAGE_GUEST_EMAIL_REGISTERED);
    expect(error.fields?.email).toEqual([MESSAGE_GUEST_EMAIL_REGISTERED]);
    expect(user.updateMany).not.toHaveBeenCalled();
  });

  it("refuses an inactive account with a 409", async () => {
    const { tx } = stubTx({ created: 0, found: inactiveShadow });
    expect((await conflictOf(resolveGuestUser(tx, contact))).status).toBe(409);
  });

  it("reuses the shadow row another checkout created in the race", async () => {
    const { tx, user } = stubTx({ created: 0, found: shadow });

    const result = await resolveGuestUser(tx, contact);

    expect(result.id).toBe(shadow.id);
    expect(user.updateMany).toHaveBeenCalledOnce();
  });

  it("gives the 409 when a sign-up won the race", async () => {
    const { tx } = stubTx({ created: 0, found: registered });
    expect((await conflictOf(resolveGuestUser(tx, contact))).status).toBe(409);
  });

  it("gives the 409 when a sign-up claims the row before the refresh", async () => {
    const { tx } = stubTx({ created: 0, found: shadow, refreshed: 0 });
    expect((await conflictOf(resolveGuestUser(tx, contact))).status).toBe(409);
  });

  it("refuses a guest row promoted to staff", async () => {
    const { tx } = stubTx({ created: 0, found: promotedGuest });
    expect((await conflictOf(resolveGuestUser(tx, contact))).status).toBe(409);
  });
});

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
