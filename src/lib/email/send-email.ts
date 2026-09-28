import "server-only";

import nodemailer from "nodemailer";
import { ServiceError } from "@/lib/api/api-response";
import { SMTP_TIMEOUT_MS } from "@/lib/constants";
import type { SmtpConfig } from "@/lib/integration-config";
import { getIntegrationConfig } from "@/services/integration.service";
import { chooseEmailOutcome, type EmailMessage } from "./email-outcome";

export type SendEmailResult = "SENT" | "LOGGED";

const MESSAGE_NOT_CONFIGURED = "Email isn't set up yet. Please try again later.";

export function notConfiguredError(): ServiceError {
  return new ServiceError("NOT_CONFIGURED", MESSAGE_NOT_CONFIGURED, 503);
}

async function sendOverSmtp(smtp: SmtpConfig, message: EmailMessage) {
  const transport = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    requireTLS: !smtp.secure,
    auth: { user: smtp.user, pass: smtp.pass },
    connectionTimeout: SMTP_TIMEOUT_MS,
    greetingTimeout: SMTP_TIMEOUT_MS,
    socketTimeout: SMTP_TIMEOUT_MS,
  });
  await transport.sendMail({
    from: smtp.from,
    to: message.to,
    subject: message.subject,
    html: message.html,
    text: message.text,
  });
}

export async function sendEmail(message: EmailMessage): Promise<SendEmailResult> {
  const { email } = await getIntegrationConfig();
  const outcome = chooseEmailOutcome(email, message, process.env.NODE_ENV);

  switch (outcome.action) {
    case "SEND":
      await sendOverSmtp(outcome.smtp, message);
      return "SENT";
    case "LOG":
      console.info(`email (console transport)\nto: ${outcome.entry.to}\nsubject: ${outcome.entry.subject}\n\n${outcome.entry.text}`);
      return "LOGGED";
    case "REFUSE":
      throw notConfiguredError();
  }
}
