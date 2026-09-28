import { describe, expect, it } from "vitest";
import type { SmtpConfig } from "@/lib/integration-config";
import { BODY_WITHHELD, chooseEmailOutcome, type EmailMessage } from "./email-outcome";

const MESSAGE: EmailMessage = {
  to: "shopper@example.com",
  subject: "Confirm your email",
  html: "<p>link</p>",
  text: "Confirm: http://localhost:3000/verify-email?token=abc",
};

const SMTP: SmtpConfig = {
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  user: "shop@gmail.com",
  pass: "secret",
  from: "Rewire <shop@gmail.com>",
};

describe("chooseEmailOutcome", () => {
  it("sends over SMTP when SMTP is configured", () => {
    expect(chooseEmailOutcome({ transport: "SMTP", smtp: SMTP }, MESSAGE, "production")).toEqual({
      action: "SEND",
      smtp: SMTP,
    });
  });

  it("logs to, subject and the body with the link outside production", () => {
    expect(chooseEmailOutcome({ transport: "CONSOLE" }, MESSAGE, "development")).toEqual({
      action: "LOG",
      entry: { to: MESSAGE.to, subject: MESSAGE.subject, text: MESSAGE.text },
    });
  });

  it("withholds the body in production so links never reach the log", () => {
    const outcome = chooseEmailOutcome({ transport: "CONSOLE" }, MESSAGE, "production");
    expect(outcome).toEqual({
      action: "LOG",
      entry: { to: MESSAGE.to, subject: MESSAGE.subject, text: BODY_WITHHELD },
    });
    expect(JSON.stringify(outcome)).not.toContain("token=");
  });

  it("refuses when email is off", () => {
    expect(chooseEmailOutcome({ transport: "OFF" }, MESSAGE, "production")).toEqual({ action: "REFUSE" });
  });
});
