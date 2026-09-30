import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createSessionToken, readSessionToken } from "./session-token";

const SECRET = "s".repeat(32) + "-test-secret-for-session-token";
const NOW_MS = 1_800_000_000_000;
const LATER_SECONDS = NOW_MS / 1000 + 60;

describe("session token", () => {
  const original = process.env.AUTH_SECRET;

  beforeEach(() => {
    process.env.AUTH_SECRET = SECRET;
  });

  afterEach(() => {
    if (original === undefined) delete process.env.AUTH_SECRET;
    else process.env.AUTH_SECRET = original;
  });

  it("round trips the user id and session version", () => {
    const token = createSessionToken("user1", 3, LATER_SECONDS);
    expect(readSessionToken(token, NOW_MS)).toEqual({ userId: "user1", sessionVersion: 3 });
  });

  it("rejects an expired token", () => {
    const token = createSessionToken("user1", 0, NOW_MS / 1000);
    expect(readSessionToken(token, NOW_MS)).toBeNull();
  });

  it("rejects a token whose version was changed", () => {
    const [userId, , expiresAt, signature] = createSessionToken("user1", 0, LATER_SECONDS).split(".");
    expect(readSessionToken(`${userId}.1.${expiresAt}.${signature}`, NOW_MS)).toBeNull();
  });

  it("rejects the old three part format", () => {
    const [userId, , expiresAt, signature] = createSessionToken("user1", 0, LATER_SECONDS).split(".");
    expect(readSessionToken(`${userId}.${expiresAt}.${signature}`, NOW_MS)).toBeNull();
  });

  it("rejects a token signed with another secret", () => {
    const token = createSessionToken("user1", 0, LATER_SECONDS);
    process.env.AUTH_SECRET = "o".repeat(32) + "-another-secret";
    expect(readSessionToken(token, NOW_MS)).toBeNull();
  });

  it("rejects a non numeric version", () => {
    const token = createSessionToken("user1", 0, LATER_SECONDS).replace(".0.", ".x.");
    expect(readSessionToken(token, NOW_MS)).toBeNull();
  });
});
