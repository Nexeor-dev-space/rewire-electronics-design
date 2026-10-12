import type { Prisma } from "@/generated/prisma/client";
import { ServiceError } from "@/lib/api/api-response";

type Tx = Prisma.TransactionClient;

export const MESSAGE_GUEST_EMAIL_REGISTERED =
  "An account with this email already exists. Sign in to continue.";

export interface GuestContact {
  email: string;
  fullName: string;
  phone: string;
}

export interface AccountState {
  isGuest: boolean;
  state: string;
  role: string;
}

export type SignUpPlan = "create" | "upgrade" | "conflict";

export const SHADOW_USER_WHERE = { isGuest: true, state: "ACTIVE", role: "CUSTOMER" } as const;

const guestSelect = { id: true, email: true, fullName: true, isGuest: true, state: true, role: true } as const;

function emailRegistered() {
  return new ServiceError("CONFLICT", MESSAGE_GUEST_EMAIL_REGISTERED, 409, {
    email: [MESSAGE_GUEST_EMAIL_REGISTERED],
  });
}

function isShadow(account: AccountState | null) {
  return (
    account !== null &&
    account.isGuest === SHADOW_USER_WHERE.isGuest &&
    account.state === SHADOW_USER_WHERE.state &&
    account.role === SHADOW_USER_WHERE.role
  );
}

export async function resolveGuestUser(tx: Tx, { email, fullName, phone }: GuestContact) {
  const { count } = await tx.user.createMany({
    data: [
      {
        email,
        fullName,
        phone,
        role: "CUSTOMER",
        state: "ACTIVE",
        isGuest: true,
        passwordHash: null,
        emailVerifiedAt: null,
      },
    ],
    skipDuplicates: true,
  });

  const user = await tx.user.findUnique({ where: { email }, select: guestSelect });
  if (!user || !isShadow(user)) throw emailRegistered();
  if (count > 0) return user;

  const refreshed = await tx.user.updateMany({
    where: { id: user.id, ...SHADOW_USER_WHERE },
    data: { fullName, phone },
  });
  if (refreshed.count === 0) throw emailRegistered();
  return { ...user, fullName };
}

export function accountForSignUp(existing: AccountState | null): SignUpPlan {
  if (!existing) return "create";
  return isShadow(existing) ? "upgrade" : "conflict";
}

export function upgradeData(
  signUp: { fullName: string; phone?: string | null },
  passwordHash: string,
) {
  return {
    fullName: signUp.fullName,
    phone: signUp.phone ?? null,
    passwordHash,
    isGuest: false,
    emailVerifiedAt: null,
    sessionVersion: { increment: 1 },
  };
}
