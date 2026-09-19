import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

/**
 * Password hashing with scrypt from `node:crypto`, stored as `salt:hash`.
 * No `server-only` import: `prisma/seed.ts` uses it outside Next.
 */

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: string,
  keyLength: number,
) => Promise<Buffer>;

const KEY_LENGTH = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const hash = await scryptAsync(password, salt, KEY_LENGTH);
  return `${salt}:${hash.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;

  const expected = Buffer.from(hash, "hex");
  const actual = await scryptAsync(password, salt, KEY_LENGTH);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
