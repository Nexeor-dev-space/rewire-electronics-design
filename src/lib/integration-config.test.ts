import { describe, expect, it } from "vitest";
import { DEV_APP_URL, INTEGRATION_HINT_MIN_VALUE_LENGTH } from "@/lib/constants";
import {
  hintOf,
  integrationFeatures,
  resolveIntegrationConfig,
  type IntegrationValues,
} from "./integration-config";
import type { IntegrationKey } from "@/types/integration";

const APP_URL = "https://rewire-electronics.com";

const SMTP: IntegrationValues = {
  SMTP_USER: "shop@gmail.com",
  SMTP_PASS: "abcdefghijklmnop",
  EMAIL_FROM: "Rewire <shop@gmail.com>",
};

const EVERYTHING: IntegrationValues = { ...SMTP, APP_URL };

function without(values: IntegrationValues, key: IntegrationKey): IntegrationValues {
  const copy = { ...values };
  delete copy[key];
  return copy;
}

describe("resolveIntegrationConfig: email and app url", () => {
  it("DEV with nothing set logs email to the console on the dev app url", () => {
    const config = resolveIntegrationConfig("DEV", {});
    expect(config.appUrl).toBe(DEV_APP_URL);
    expect(config.email).toEqual({ transport: "CONSOLE" });
  });

  it("DEV with user, pass and from sends over smtp.gmail.com:587 with STARTTLS", () => {
    const config = resolveIntegrationConfig("DEV", SMTP);
    expect(config.email).toEqual({
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

  it("uses a stored host and port, and port 465 turns on implicit TLS", () => {
    const config = resolveIntegrationConfig("LIVE", {
      ...SMTP,
      APP_URL,
      SMTP_HOST: "smtp.resend.com",
      SMTP_PORT: "465",
    });
    expect(config.email).toMatchObject({
      transport: "SMTP",
      smtp: { host: "smtp.resend.com", port: 465, secure: true },
    });
  });

  it("DEV missing EMAIL_FROM falls back to the console", () => {
    expect(resolveIntegrationConfig("DEV", without(SMTP, "EMAIL_FROM")).email).toEqual({ transport: "CONSOLE" });
  });

  it("LIVE missing SMTP_PASS turns email off", () => {
    expect(resolveIntegrationConfig("LIVE", without(EVERYTHING, "SMTP_PASS")).email).toEqual({ transport: "OFF" });
  });

  it("LIVE with SMTP and APP_URL sends over SMTP", () => {
    const config = resolveIntegrationConfig("LIVE", { ...SMTP, APP_URL });
    expect(config.appUrl).toBe(APP_URL);
    expect(config.email.transport).toBe("SMTP");
  });

  it("LIVE missing APP_URL turns email off", () => {
    const config = resolveIntegrationConfig("LIVE", without(EVERYTHING, "APP_URL"));
    expect(config.appUrl).toBeNull();
    expect(config.email).toEqual({ transport: "OFF" });
  });

  it("DEV prefers a stored APP_URL over the dev default", () => {
    expect(resolveIntegrationConfig("DEV", { APP_URL }).appUrl).toBe(APP_URL);
  });
});

describe("integrationFeatures", () => {
  it("summarises what the runtime does", () => {
    expect(integrationFeatures(resolveIntegrationConfig("LIVE", EVERYTHING))).toEqual({ email: "SMTP" });
    expect(integrationFeatures(resolveIntegrationConfig("DEV", {}))).toEqual({ email: "CONSOLE" });
  });
});

describe("hintOf", () => {
  it("returns the last four characters of a long enough value", () => {
    expect(hintOf("abcdefghijkl")).toBe("ijkl");
  });

  it("returns a hint at exactly the minimum length", () => {
    expect(hintOf("x".repeat(INTEGRATION_HINT_MIN_VALUE_LENGTH - 4) + "1234")).toBe("1234");
  });

  it("returns null for values shorter than the minimum", () => {
    expect(hintOf("587")).toBeNull();
    expect(hintOf("x".repeat(INTEGRATION_HINT_MIN_VALUE_LENGTH - 1))).toBeNull();
  });
});
