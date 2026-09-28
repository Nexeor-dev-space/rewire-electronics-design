import {
  DEV_APP_URL,
  INTEGRATION_HINT_LENGTH,
  INTEGRATION_HINT_MIN_VALUE_LENGTH,
  SMTP_DEFAULT_HOST,
  SMTP_DEFAULT_PORT,
  SMTP_IMPLICIT_TLS_PORT,
} from "@/lib/constants";
import type { IntegrationKey, IntegrationMode, IntegrationStatus } from "@/types/integration";

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

export interface IntegrationConfig {
  mode: IntegrationMode;
  appUrl: string | null;
  email: { transport: "SMTP"; smtp: SmtpConfig } | { transport: "CONSOLE" } | { transport: "OFF" };
}

export type IntegrationValues = Partial<Record<IntegrationKey, string>>;

function resolveEmail(
  mode: IntegrationMode,
  values: IntegrationValues,
  appUrl: string | null,
): IntegrationConfig["email"] {
  const { SMTP_USER: user, SMTP_PASS: pass, EMAIL_FROM: from } = values;
  if (user && pass && from && appUrl) {
    const port = values.SMTP_PORT ? Number(values.SMTP_PORT) : SMTP_DEFAULT_PORT;
    return {
      transport: "SMTP",
      smtp: {
        host: values.SMTP_HOST ?? SMTP_DEFAULT_HOST,
        port,
        secure: port === SMTP_IMPLICIT_TLS_PORT,
        user,
        pass,
        from,
      },
    };
  }
  return { transport: mode === "DEV" ? "CONSOLE" : "OFF" };
}

export function resolveIntegrationConfig(
  mode: IntegrationMode,
  values: IntegrationValues,
): IntegrationConfig {
  const appUrl = values.APP_URL ?? (mode === "DEV" ? DEV_APP_URL : null);
  return {
    mode,
    appUrl,
    email: resolveEmail(mode, values, appUrl),
  };
}

export function integrationFeatures(config: IntegrationConfig): IntegrationStatus["features"] {
  return {
    email: config.email.transport,
  };
}

export function hintOf(value: string): string | null {
  if (value.length < INTEGRATION_HINT_MIN_VALUE_LENGTH) return null;
  return value.slice(-INTEGRATION_HINT_LENGTH);
}
