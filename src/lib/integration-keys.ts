import { SMTP_DEFAULT_HOST, SMTP_DEFAULT_PORT } from "@/lib/constants";

export const INTEGRATION_MODES = ["DEV", "LIVE"] as const;

export const INTEGRATION_KEYS = [
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASS",
  "EMAIL_FROM",
  "APP_URL",
] as const;

export const HIDDEN_INTEGRATION_KEYS = [
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "APPLE_CLIENT_ID",
  "APPLE_TEAM_ID",
  "APPLE_KEY_ID",
  "APPLE_PRIVATE_KEY",
] as const;

type Key = (typeof INTEGRATION_KEYS)[number];

export function isIntegrationKey(value: string): value is Key {
  return (INTEGRATION_KEYS as readonly string[]).includes(value);
}

export const INTEGRATION_KEY_LABELS: Record<Key, string> = {
  SMTP_HOST: "SMTP host",
  SMTP_PORT: "SMTP port",
  SMTP_USER: "SMTP username",
  SMTP_PASS: "SMTP password",
  EMAIL_FROM: "Sender address",
  APP_URL: "Site address",
};

export const INTEGRATION_KEY_HELP: Record<Key, string> = {
  SMTP_HOST: "smtp.gmail.com in development, smtp.resend.com in production.",
  SMTP_PORT: "587 for STARTTLS, 465 for implicit TLS.",
  SMTP_USER: "Your Gmail address in development, resend in production.",
  SMTP_PASS: "Gmail app password in development, the Resend API key in production.",
  EMAIL_FROM: "The sender customers see, like Rewire <no-reply@rewire-electronics.com>.",
  APP_URL: "The public site address used in email links.",
};

export const INTEGRATION_KEY_GROUPS: readonly { label: string; keys: readonly Key[] }[] = [
  { label: "Email", keys: ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "EMAIL_FROM"] },
  { label: "Site", keys: ["APP_URL"] },
];

export const SECRET_INTEGRATION_KEYS: readonly Key[] = ["SMTP_PASS"];

export const MULTILINE_INTEGRATION_KEYS: readonly Key[] = [];

export const INTEGRATION_KEY_DEFAULTS: Partial<Record<Key, string>> = {
  SMTP_HOST: SMTP_DEFAULT_HOST,
  SMTP_PORT: String(SMTP_DEFAULT_PORT),
};
