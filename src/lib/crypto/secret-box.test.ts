import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openSecret, sealSecret } from "./secret-box";

const SECRET_A = "a".repeat(32) + "-test-secret-for-secret-box";
const SECRET_B = "b".repeat(32) + "-another-secret-for-secret-box";
const CONTEXT = "SMTP_PASS";
const PLAIN = "abcd efgh ijkl mnop";

function flipFirstChar(part: string): string {
  const replacement = part[0] === "A" ? "B" : "A";
  return replacement + part.slice(1);
}

function tamper(sealed: string, index: number): string {
  const parts = sealed.split(".");
  parts[index] = flipFirstChar(parts[index]);
  return parts.join(".");
}

describe("secret-box", () => {
  const original = process.env.AUTH_SECRET;

  beforeEach(() => {
    process.env.AUTH_SECRET = SECRET_A;
  });

  afterEach(() => {
    if (original === undefined) delete process.env.AUTH_SECRET;
    else process.env.AUTH_SECRET = original;
  });

  it("opens what it sealed", () => {
    expect(openSecret(sealSecret(PLAIN, CONTEXT), CONTEXT)).toBe(PLAIN);
  });

  it("keeps multiline and unicode values intact", () => {
    const pem = "-----BEGIN PRIVATE KEY-----\nMIGT\n-----END PRIVATE KEY-----";
    expect(openSecret(sealSecret(pem, CONTEXT), CONTEXT)).toBe(pem);
    expect(openSecret(sealSecret("Rewire électronique", CONTEXT), CONTEXT)).toBe("Rewire électronique");
  });

  it("uses the v1 format with four base64url parts", () => {
    const sealed = sealSecret(PLAIN, CONTEXT);
    const parts = sealed.split(".");
    expect(parts).toHaveLength(4);
    expect(parts[0]).toBe("v1");
    for (const part of parts.slice(1)) expect(part).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("gives a different sealed string each time", () => {
    expect(sealSecret(PLAIN, CONTEXT)).not.toBe(sealSecret(PLAIN, CONTEXT));
  });

  it.each([
    ["iv", 1],
    ["tag", 2],
    ["ciphertext", 3],
  ])("throws when the %s is changed", (_name, index) => {
    const sealed = sealSecret(PLAIN, CONTEXT);
    expect(() => openSecret(tamper(sealed, index), CONTEXT)).toThrow();
  });

  it("throws for another context", () => {
    const sealed = sealSecret(PLAIN, CONTEXT);
    expect(() => openSecret(sealed, "SMTP_USER")).toThrow();
  });

  it("throws under another AUTH_SECRET", () => {
    const sealed = sealSecret(PLAIN, CONTEXT);
    process.env.AUTH_SECRET = SECRET_B;
    expect(() => openSecret(sealed, CONTEXT)).toThrow();
  });

  it.each(["", "v1", "v1.a.b", "v2.a.b.c", "v1.a.b.c.d", "not a sealed value"])(
    "throws for the malformed value %j",
    (value) => {
      expect(() => openSecret(value, CONTEXT)).toThrow();
    },
  );

  it("throws when AUTH_SECRET is missing or short", () => {
    process.env.AUTH_SECRET = "short";
    expect(() => sealSecret(PLAIN, CONTEXT)).toThrow(/AUTH_SECRET/);
    delete process.env.AUTH_SECRET;
    expect(() => sealSecret(PLAIN, CONTEXT)).toThrow(/AUTH_SECRET/);
  });
});
