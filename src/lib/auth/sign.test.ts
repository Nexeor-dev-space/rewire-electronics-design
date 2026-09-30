import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { signed, verifySigned } from "./sign";

const SECRET = "s".repeat(32) + "-test-secret-for-signed-values";

describe("signed values", () => {
  const original = process.env.AUTH_SECRET;

  beforeEach(() => {
    process.env.AUTH_SECRET = SECRET;
  });

  afterEach(() => {
    if (original === undefined) delete process.env.AUTH_SECRET;
    else process.env.AUTH_SECRET = original;
  });

  it("round trips a payload, dots included", () => {
    expect(verifySigned(signed("token"))).toBe("token");
    expect(verifySigned(signed("a.b.c"))).toBe("a.b.c");
  });

  it("rejects a changed payload or signature", () => {
    const value = signed("token");
    expect(verifySigned(value.replace("token", "tokem"))).toBeNull();
    expect(verifySigned(`${value}x`)).toBeNull();
  });

  it("rejects values without a payload or signature", () => {
    expect(verifySigned("token")).toBeNull();
    expect(verifySigned(".signature")).toBeNull();
    expect(verifySigned("token.")).toBeNull();
  });

  it("rejects a value signed with another secret", () => {
    const value = signed("token");
    process.env.AUTH_SECRET = "o".repeat(40);
    expect(verifySigned(value)).toBeNull();
  });
});
