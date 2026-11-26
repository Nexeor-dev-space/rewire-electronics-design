export interface AccountState {
  isGuest: boolean;
  state: string;
  role: string;
}

export type SignUpPlan = "create" | "upgrade" | "conflict";

export const SHADOW_USER_WHERE = { isGuest: true, state: "ACTIVE", role: "CUSTOMER" } as const;

function isShadow(account: AccountState | null) {
  return (
    account !== null &&
    account.isGuest === SHADOW_USER_WHERE.isGuest &&
    account.state === SHADOW_USER_WHERE.state &&
    account.role === SHADOW_USER_WHERE.role
  );
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
