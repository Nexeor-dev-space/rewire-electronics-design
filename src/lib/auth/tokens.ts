import { createHash, randomBytes } from "node:crypto";
import type { AuthTokenType, Prisma } from "@/generated/prisma/client";
import { AUTH_TOKEN_BYTES, RESET_TOKEN_TTL_SECONDS, VERIFY_TOKEN_TTL_SECONDS } from "@/lib/constants";

type Tx = Prisma.TransactionClient;

const TOKEN_TTL_SECONDS: Record<AuthTokenType, number> = {
  VERIFY: VERIFY_TOKEN_TTL_SECONDS,
  RESET: RESET_TOKEN_TTL_SECONDS,
};

const MS_PER_SECOND = 1000;

export function createRandomToken(): string {
  return randomBytes(AUTH_TOKEN_BYTES).toString("base64url");
}

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function authTokenExpiry(type: AuthTokenType, now: Date = new Date()): Date {
  return new Date(now.getTime() + TOKEN_TTL_SECONDS[type] * MS_PER_SECOND);
}

export async function issueAuthToken(tx: Tx, userId: string, type: AuthTokenType): Promise<string> {
  const raw = createRandomToken();
  await tx.authToken.deleteMany({ where: { userId, type } });
  await tx.authToken.create({
    data: { userId, type, tokenHash: hashToken(raw), expiresAt: authTokenExpiry(type) },
  });
  return raw;
}

export async function consumeAuthToken(tx: Tx, raw: string, type: AuthTokenType): Promise<string | null> {
  const tokenHash = hashToken(raw);
  const now = new Date();
  const { count } = await tx.authToken.updateMany({
    where: { tokenHash, type, usedAt: null, expiresAt: { gt: now } },
    data: { usedAt: now },
  });
  if (count !== 1) return null;

  const token = await tx.authToken.findUnique({ where: { tokenHash }, select: { userId: true } });
  return token?.userId ?? null;
}
