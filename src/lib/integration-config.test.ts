import { describe, expect, it } from "vitest";
import { DEV_APP_URL, SMTP_DEFAULT_HOST, SMTP_DEFAULT_PORT } from "@/lib/constants";
import type { EmailEnv } from "./env";
import { describeEmailTransport, resolveIntegrationConfig } from "./integration-config";

const APP_URL = "https://rewire-electronics.com";

const NOTHING: EmailEnv = { SMTP_HOST: SMTP_DEFAULT_HOST, SMTP_PORT: SMTP_DEFAULT_PORT };

const SMTP: EmailEnv = {
  ...NOTHING,
  SMTP_USER: "shop@gmail.com",
  SMTP_PASS: "abcdefghijklmnop",
  EMAIL_FROM: "Rewire <shop@gmail.com>",
};

describe("resolveIntegrationConfig: email and app url", () => {
  it("development with nothing set logs email to the console on the dev app url", () => {
    const config = resolveIntegrationConfig(NOTHING, "development");
    expect(config.appUrl).toBe(DEV_APP_URL);
    expect(config.email).toEqual({ transport: "CONSOLE" });
  });

  it("development with user, pass and from sends over smtp.gmail.com:587 with STARTTLS", () => {
    expect(resolveIntegrationConfig(SMTP, "development").email).toEqual({
      transport: "SMTP",
      smtp: {
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        user: SMTP.SMTP_USER,
        pass: SMTP.SMTP_PASS,
        from: SMTP.EMAIL_FROM,
      },
    });
  });

  it("uses the given host and port, and port 465 turns on implicit TLS", () => {
    const config = resolveIntegrationConfig({ ...SMTP, APP_URL, SMTP_HOST: "smtp.resend.com", SMTP_PORT: 465 }, "production");
    expect(config.email).toMatchObject({
      transport: "SMTP",
      smtp: { host: "smtp.resend.com", port: 465, secure: true },
    });
  });

  it("production with SMTP and APP_URL sends over SMTP", () => {
    const config = resolveIntegrationConfig({ ...SMTP, APP_URL }, "production");
    expect(config.appUrl).toBe(APP_URL);
    expect(config.email.transport).toBe("SMTP");
  });

  it("production without SMTP turns email off", () => {
    expect(resolveIntegrationConfig({ ...NOTHING, APP_URL }, "production").email).toEqual({ transport: "OFF" });
  });

  it("production missing APP_URL turns email off", () => {
    const config = resolveIntegrationConfig(SMTP, "production");
    expect(config.appUrl).toBeNull();
    expect(config.email).toEqual({ transport: "OFF" });
  });

  it("development prefers APP_URL over the dev default", () => {
    expect(resolveIntegrationConfig({ ...NOTHING, APP_URL }, "development").appUrl).toBe(APP_URL);
  });
});

describe("describeEmailTransport", () => {
  it("names host, port and sender for SMTP, never the password", () => {
    const line = describeEmailTransport(resolveIntegrationConfig({ ...SMTP, APP_URL }, "production"));
    expect(line).toBe("email transport: SMTP (smtp.gmail.com:587, from Rewire <shop@gmail.com>)");
    expect(line).not.toContain(SMTP.SMTP_PASS);
  });

  it("says why for CONSOLE and OFF", () => {
    expect(describeEmailTransport(resolveIntegrationConfig(NOTHING, "development"))).toBe(
      "email transport: CONSOLE (SMTP_USER, SMTP_PASS and EMAIL_FROM not set; emails print here)",
    );
    expect(describeEmailTransport(resolveIntegrationConfig(NOTHING, "production"))).toBe(
      "email transport: OFF (production needs SMTP_USER, SMTP_PASS, EMAIL_FROM and APP_URL)",
    );
  });
});
