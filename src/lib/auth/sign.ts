import { createHmac, timingSafeEqual } from "node:crypto";
import { readAuthSecret } from "./auth-secret";

const SEPARATOR = ".";

export function sign(payload: string): string {
  return createHmac("sha256", readAuthSecret()).update(payload).digest("base64url");
}

export function signed(payload: string): string {
  return `${payload}${SEPARATOR}${sign(payload)}`;
}

export function verifySigned(value: string): string | null {
  const cut = value.lastIndexOf(SEPARATOR);
  if (cut <= 0 || cut === value.length - 1) return null;

  const payload = value.slice(0, cut);
  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(value.slice(cut + 1));
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  return payload;
}
