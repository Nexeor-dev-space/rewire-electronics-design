import { describe, expect, it } from "vitest";
import { SMTP_DEFAULT_HOST, SMTP_DEFAULT_PORT } from "@/lib/constants";
import { optionalDatabaseUrl, parseAuthEnv, parseDatabaseEnv, parseEmailEnv } from "./env";

const SECRET = "x".repeat(32);
const DATABASE_URL = "postgresql://user:pass@localhost:5432/rewire";

describe("parseDatabaseEnv", () => {
  it("reads DATABASE_URL on its own", () => {
    expect(parseDatabaseEnv({ DATABASE_URL })).toEqual({ DATABASE_URL });
  });

  it("rejects a missing or blank DATABASE_URL", () => {
    expect(() => parseDatabaseEnv({})).toThrow(/DATABASE_URL/);
    expect(() => parseDatabaseEnv({ DATABASE_URL: "  " })).toThrow(/DATABASE_URL/);
  });
});

describe("parseAuthEnv", () => {
  it("reads AUTH_SECRET on its own", () => {
    expect(parseAuthEnv({ AUTH_SECRET: SECRET })).toEqual({ AUTH_SECRET: SECRET });
  });

  it("rejects a missing or short AUTH_SECRET", () => {
    expect(() => parseAuthEnv({})).toThrow(/AUTH_SECRET/);
    expect(() => parseAuthEnv({ AUTH_SECRET: "short" })).toThrow(/AUTH_SECRET/);
  });
});

describe("parseEmailEnv", () => {
  const SMTP = { SMTP_USER: "shop@gmail.com", SMTP_PASS: "abcd efgh ijkl mnop", EMAIL_FROM: "Rewire <shop@gmail.com>" };

  it("defaults host and port and leaves the rest unset", () => {
    expect(parseEmailEnv({})).toEqual({ SMTP_HOST: SMTP_DEFAULT_HOST, SMTP_PORT: SMTP_DEFAULT_PORT });
  });

  it("reads every value, coercing the port", () => {
    expect(
      parseEmailEnv({ ...SMTP, SMTP_HOST: "smtp.resend.com", SMTP_PORT: "465", APP_URL: "https://rewire.ae" }),
    ).toEqual({ ...SMTP, SMTP_HOST: "smtp.resend.com", SMTP_PORT: 465, APP_URL: "https://rewire.ae" });
  });

  it("treats empty strings as unset", () => {
    expect(parseEmailEnv({ SMTP_HOST: "", SMTP_PORT: " ", SMTP_USER: "", SMTP_PASS: "", EMAIL_FROM: "", APP_URL: "" })).toEqual({
      SMTP_HOST: SMTP_DEFAULT_HOST,
      SMTP_PORT: SMTP_DEFAULT_PORT,
    });
  });

  it("rejects SMTP_USER without SMTP_PASS, naming the missing key", () => {
    expect(() => parseEmailEnv({ SMTP_USER: SMTP.SMTP_USER, EMAIL_FROM: SMTP.EMAIL_FROM })).toThrow(/SMTP_PASS/);
  });

  it("accepts EMAIL_FROM as an address or Name <address>", () => {
    expect(parseEmailEnv({ ...SMTP, EMAIL_FROM: "no-reply@rewire.ae" }).EMAIL_FROM).toBe("no-reply@rewire.ae");
    expect(parseEmailEnv({ ...SMTP, EMAIL_FROM: "Rewire <no-reply@rewire.ae>" }).EMAIL_FROM).toBe("Rewire <no-reply@rewire.ae>");
  });

  it("rejects an EMAIL_FROM that is not an address", () => {
    expect(() => parseEmailEnv({ ...SMTP, EMAIL_FROM: "mailto:shop@gmail.com" })).toThrow(/EMAIL_FROM/);
    expect(() => parseEmailEnv({ ...SMTP, EMAIL_FROM: "Rewire" })).toThrow(/EMAIL_FROM/);
  });

  it("rejects an APP_URL that is not a URL", () => {
    expect(() => parseEmailEnv({ APP_URL: "rewire.ae" })).toThrow(/APP_URL/);
  });
});

describe("optionalDatabaseUrl", () => {
  it("returns the trimmed url or undefined", () => {
    expect(optionalDatabaseUrl({ DATABASE_URL: ` ${DATABASE_URL} ` })).toBe(DATABASE_URL);
    expect(optionalDatabaseUrl({ DATABASE_URL: "" })).toBeUndefined();
    expect(optionalDatabaseUrl({})).toBeUndefined();
  });
});
