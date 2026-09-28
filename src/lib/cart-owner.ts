import "server-only";

import { cookies } from "next/headers";
import { getSession } from "@/lib/auth/session";
import { signed, verifySigned } from "@/lib/auth/sign";
import { hashToken } from "@/lib/auth/tokens";
import { CART_COOKIE_MAX_AGE_SECONDS } from "@/lib/constants";

export type CartOwner =
  | { kind: "user"; userId: string }
  | { kind: "guest"; tokenHash: string }
  | null;

const COOKIE = "rewire_cart";

export async function readGuestTokenHash(): Promise<string | null> {
  const value = (await cookies()).get(COOKIE)?.value;
  const rawToken = value ? verifySigned(value) : null;
  return rawToken ? hashToken(rawToken) : null;
}

export async function resolveCartOwner(): Promise<CartOwner> {
  const session = await getSession();
  if (session) return { kind: "user", userId: session.user.id };

  const tokenHash = await readGuestTokenHash();
  return tokenHash ? { kind: "guest", tokenHash } : null;
}

export async function setGuestCartCookie(rawToken: string) {
  (await cookies()).set(COOKIE, signed(rawToken), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: CART_COOKIE_MAX_AGE_SECONDS,
  });
}

export async function clearGuestCartCookie() {
  const jar = await cookies();
  if (jar.has(COOKIE)) jar.delete(COOKIE);
}
