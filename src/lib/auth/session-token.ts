import { signed, verifySigned } from "./sign";

export interface SessionClaim {
  userId: string;
  sessionVersion: number;
}

const SESSION_PAYLOAD_PARTS = 3;
const DIGITS = /^\d+$/;
const MS_PER_SECOND = 1000;

export function createSessionToken(userId: string, sessionVersion: number, expiresAtSeconds: number): string {
  return signed(`${userId}.${sessionVersion}.${expiresAtSeconds}`);
}

export function readSessionToken(token: string, nowMs: number = Date.now()): SessionClaim | null {
  const payload = verifySigned(token);
  if (!payload) return null;

  const parts = payload.split(".");
  if (parts.length !== SESSION_PAYLOAD_PARTS) return null;

  const [userId, sessionVersion, expiresAt] = parts;
  if (!userId || !DIGITS.test(sessionVersion) || !DIGITS.test(expiresAt)) return null;

  if (Number(expiresAt) * MS_PER_SECOND <= nowMs) return null;
  return { userId, sessionVersion: Number(sessionVersion) };
}
