import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { apiError } from "@/lib/api/api-response";
import { prisma } from "@/lib/db";
import type { SessionUser } from "@/types/auth";
import { hasPermission } from "./permissions";

/**
 * Sessions are a signed cookie — `<userId>.<expiresAt>.<signature>` — with
 * no session table. The cookie only proves who is asking: role and state are
 * read from the user row on every request, so a role change or a delete
 * applies immediately.
 */

export interface Session {
  user: SessionUser;
}

const COOKIE = "rewire_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function sign(payload: string): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be set in .env to at least 32 characters.");
  }
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function readUserId(token: string): string | null {
  const [userId, expiresAt, signature] = token.split(".");
  if (!userId || !expiresAt || !signature) return null;

  const expected = Buffer.from(sign(`${userId}.${expiresAt}`));
  const actual = Buffer.from(signature);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;

  return Number(expiresAt) * 1000 > Date.now() ? userId : null;
}

export const getSession = cache(async (): Promise<Session | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  const userId = token ? readUserId(token) : null;
  if (!userId) return null;

  const user = await prisma.user.findFirst({
    where: { id: userId, state: "ACTIVE" },
    select: { id: true, fullName: true, email: true, role: true },
  });
  return user ? { user } : null;
});

export async function startSession(userId: string) {
  const payload = `${userId}.${Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS}`;
  (await cookies()).set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

/**
 * API guard: no session → 401, a permission the role lacks → 403.
 *
 *   const auth = await authorizeApi(PERMISSIONS.customers);
 *   if (!auth.ok) return auth.response;
 */
export async function authorizeApi(
  permission?: string,
): Promise<{ ok: true; session: Session } | { ok: false; response: Response }> {
  const session = await getSession();
  if (!session) {
    return { ok: false, response: apiError("UNAUTHENTICATED", "Please sign in to continue.", 401) };
  }
  if (permission && !hasPermission(session.user.role, permission)) {
    return { ok: false, response: apiError("FORBIDDEN", "Your account doesn't have access to this.", 403) };
  }
  return { ok: true, session };
}
