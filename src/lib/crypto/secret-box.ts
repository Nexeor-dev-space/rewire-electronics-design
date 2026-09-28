import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";
import { readAuthSecret } from "@/lib/auth/auth-secret";

const ALGORITHM = "aes-256-gcm";
const VERSION = "v1";
const KEY_INFO = "rewire:integration-credentials:v1";
const KEY_BYTES = 32;
const IV_BYTES = 12;
const TAG_BYTES = 16;

let cachedKey: { secret: string; key: Buffer } | null = null;

function encryptionKey(): Buffer {
  const secret = readAuthSecret();
  if (cachedKey?.secret !== secret) {
    cachedKey = { secret, key: Buffer.from(hkdfSync("sha256", secret, "", KEY_INFO, KEY_BYTES)) };
  }
  return cachedKey.key;
}

export function sealSecret(plain: string, context: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, encryptionKey(), iv, { authTagLength: TAG_BYTES });
  cipher.setAAD(Buffer.from(context, "utf8"));
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv, tag, ciphertext]
    .map((part) => (typeof part === "string" ? part : part.toString("base64url")))
    .join(".");
}

export function openSecret(sealed: string, context: string): string {
  const parts = sealed.split(".");
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error("Sealed value has an unknown format.");
  }
  const [iv, tag, ciphertext] = parts.slice(1).map((part) => Buffer.from(part, "base64url"));
  if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) {
    throw new Error("Sealed value has an unknown format.");
  }
  const decipher = createDecipheriv(ALGORITHM, encryptionKey(), iv, { authTagLength: TAG_BYTES });
  decipher.setAAD(Buffer.from(context, "utf8"));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
