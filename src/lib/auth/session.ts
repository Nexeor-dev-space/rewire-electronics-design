import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { apiError } from "@/lib/api/api-response";
import { SESSION_MAX_AGE_SECONDS } from "@/lib/constants";
import { prisma } from "@/lib/db";
import type { SessionUser } from "@/types/auth";
import {
  fullGrid,
  gridFromLevels,
  hasPermission,
  type PermissionAction,
  type PermissionGrid,
  type Role,
  type StoredAccessLevel,
} from "./permissions";
import { createSessionToken, readSessionToken } from "./session-token";

/**
 * Sessions are a signed cookie — `<userId>.<sessionVersion>.<expiresAt>.<signature>` —
 * with no session table. The cookie only proves who is asking: role, state and
 * session version are read from the user row on every request, so a role
 * change, a delete or a password reset applies immediately.
 */

export interface Session {
  user: SessionUser;
}

const COOKIE = "rewire_session";

export const getSession = cache(async (): Promise<Session | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  const claim = token ? readSessionToken(token) : null;
  if (!claim) return null;

  const user = await prisma.user.findFirst({
    where: { id: claim.userId, state: "ACTIVE", sessionVersion: claim.sessionVersion },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      emailVerifiedAt: true,
      createdAt: true,
      // A Staff role's levels ride on the same query, so a role edit applies on the next request.
      staffRole: { select: { permissions: { select: { module: true, level: true } } } },
    },
  });
  if (!user) return null;

  const { emailVerifiedAt, staffRole, ...rest } = user;
  const permissions = permissionsFor(user.role, staffRole?.permissions ?? []);
  return { user: { ...rest, emailVerified: emailVerifiedAt !== null, permissions } };
});

/** Admin: everything. Staff: its role's levels (none without a role). Customer: nothing. */
function permissionsFor(role: Role, levels: { module: string; level: StoredAccessLevel }[]): PermissionGrid {
  if (role === "ADMIN") return fullGrid();
  if (role === "STAFF") return gridFromLevels(levels);
  return {};
}

export async function startSession(userId: string, sessionVersion: number) {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS;
  (await cookies()).set(COOKIE, createSessionToken(userId, sessionVersion, expiresAt), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

export async function hasSessionCookie(): Promise<boolean> {
  return (await cookies()).has(COOKIE);
}

export function forbidden(): Response {
  return apiError("FORBIDDEN", "Your account doesn't have access to this.", 403);
}

/**
 * API guard: no session → 401, an action the role lacks on the module → 403.
 *
 *   const auth = await authorizeApi(PERMISSIONS.coupons, "DELETE");
 *   if (!auth.ok) return auth.response;
 */
export async function authorizeApi(
  module?: string,
  action: PermissionAction = "VIEW",
): Promise<{ ok: true; session: Session } | { ok: false; response: Response }> {
  const session = await getSession();
  if (!session) {
    return { ok: false, response: apiError("UNAUTHENTICATED", "Please sign in to continue.", 401) };
  }
  if (module && !hasPermission(session.user.permissions, module, action)) {
    return { ok: false, response: forbidden() };
  }
  return { ok: true, session };
}
