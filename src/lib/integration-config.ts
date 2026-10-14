import { DEV_APP_URL, SMTP_IMPLICIT_TLS_PORT } from "@/lib/constants";
import { emailEnv, type EmailEnv } from "@/lib/env";

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

export interface IntegrationConfig {
  appUrl: string | null;
  email: { transport: "SMTP"; smtp: SmtpConfig } | { transport: "CONSOLE" } | { transport: "OFF" };
}

function resolveEmail(env: EmailEnv, production: boolean, appUrl: string | null): IntegrationConfig["email"] {
  const { SMTP_USER: user, SMTP_PASS: pass, EMAIL_FROM: from } = env;
  if (user && pass && from && appUrl) {
    return {
      transport: "SMTP",
      smtp: {
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === SMTP_IMPLICIT_TLS_PORT,
        user,
        pass,
        from,
      },
    };
  }
  return { transport: production ? "OFF" : "CONSOLE" };
}

export function resolveIntegrationConfig(env: EmailEnv, nodeEnv: string | undefined): IntegrationConfig {
  const production = nodeEnv === "production";
  const appUrl = env.APP_URL ?? (production ? null : DEV_APP_URL);
  return { appUrl, email: resolveEmail(env, production, appUrl) };
}

export function describeEmailTransport(config: IntegrationConfig): string {
  switch (config.email.transport) {
    case "SMTP":
      return `email transport: SMTP (${config.email.smtp.host}:${config.email.smtp.port}, from ${config.email.smtp.from})`;
    case "CONSOLE":
      return "email transport: CONSOLE (SMTP_USER, SMTP_PASS and EMAIL_FROM not set; emails print here)";
    case "OFF":
      return "email transport: OFF (production needs SMTP_USER, SMTP_PASS, EMAIL_FROM and APP_URL)";
  }
}

let config: IntegrationConfig | undefined;

export function getIntegrationConfig(): IntegrationConfig {
  if (!config) {
    config = resolveIntegrationConfig(emailEnv(), process.env.NODE_ENV);
    console.info(describeEmailTransport(config));
  }
  return config;
}
