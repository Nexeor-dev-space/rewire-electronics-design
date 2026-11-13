import "server-only";

import nodemailer from "nodemailer";
import { ServiceError } from "@/lib/api/api-response";
import { SMTP_TIMEOUT_MS } from "@/lib/constants";
import { getIntegrationConfig, type SmtpConfig } from "@/lib/integration-config";
import { getContactDetails } from "@/services/store-settings.service";
import { chooseEmailOutcome, type EmailMessage } from "./email-outcome";
import { withContactFooter } from "./templates";

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

/** The footer is a courtesy: if the settings cannot be read, the email still goes out without it. */
async function withSavedFooter(message: EmailMessage): Promise<EmailMessage> {
  try {
    return withContactFooter(message, await getContactDetails());
  } catch (error) {
    console.error("email footer skipped: could not read the contact details", error);
    return message;
  }
}

export async function sendEmail(original: EmailMessage): Promise<SendEmailResult> {
  const { email } = getIntegrationConfig();
  const message = await withSavedFooter(original);
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
