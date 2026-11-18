import type { IntegrationConfig, SmtpConfig } from "@/lib/integration-config";

/** An image sent inside the email, shown with `src="cid:…"`, so it needs no public web address. */
export interface InlineImage {
  cid: string;
  filename: string;
  content: Buffer;
  contentType: string;
}

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
  /** A fully designed email that carries its own help and footer, so the plain contact footer is not added. */
  branded?: boolean;
  images?: InlineImage[];
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
