import type { IntegrationConfig, SmtpConfig } from "@/lib/integration-config";

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

export interface EmailMessage extends EmailContent {
  to: string;
}

export interface ConsoleEmail {
  to: string;
  subject: string;
  text: string;
}

export type EmailOutcome =
  | { action: "SEND"; smtp: SmtpConfig }
  | { action: "LOG"; entry: ConsoleEmail }
  | { action: "REFUSE" };

export const BODY_WITHHELD = "(body withheld in production)";

export function chooseEmailOutcome(
  email: IntegrationConfig["email"],
  message: EmailMessage,
  nodeEnv: string | undefined,
): EmailOutcome {
  switch (email.transport) {
    case "SMTP":
      return { action: "SEND", smtp: email.smtp };
    case "CONSOLE":
      return {
        action: "LOG",
        entry: {
          to: message.to,
          subject: message.subject,
          text: nodeEnv === "production" ? BODY_WITHHELD : message.text,
        },
      };
    case "OFF":
      return { action: "REFUSE" };
  }
}
