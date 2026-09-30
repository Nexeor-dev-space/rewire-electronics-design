import { describe, expect, it } from "vitest";
import { RESET_TOKEN_TTL_SECONDS, VERIFY_TOKEN_TTL_SECONDS } from "@/lib/constants";
import { authTokenExpiry, createRandomToken, hashToken } from "./tokens";

const BASE64URL_TOKEN = /^[A-Za-z0-9_-]{43}$/;

describe("createRandomToken", () => {
  it("returns 43 base64url characters", () => {
    expect(createRandomToken()).toMatch(BASE64URL_TOKEN);
  });

  it("returns a different token each call", () => {
    expect(createRandomToken()).not.toBe(createRandomToken());
  });
});

describe("hashToken", () => {
  it("is the SHA-256 hex digest", () => {
    expect(hashToken("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });

  it("is stable for one token and differs between tokens", () => {
    const token = createRandomToken();
    expect(hashToken(token)).toBe(hashToken(token));
    expect(hashToken(token)).not.toBe(hashToken(createRandomToken()));
  });
});

describe("authTokenExpiry", () => {
  const now = new Date("2026-09-28T10:00:00.000Z");

  it("gives verify links their own lifetime", () => {
    expect(authTokenExpiry("VERIFY", now).getTime() - now.getTime()).toBe(VERIFY_TOKEN_TTL_SECONDS * 1000);
  });

  it("gives reset links their own lifetime", () => {
    expect(authTokenExpiry("RESET", now).getTime() - now.getTime()).toBe(RESET_TOKEN_TTL_SECONDS * 1000);
  });
});
