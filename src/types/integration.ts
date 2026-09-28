import type { INTEGRATION_KEYS, INTEGRATION_MODES } from "@/lib/integration-keys";

export type IntegrationMode = (typeof INTEGRATION_MODES)[number];
export type IntegrationKey = (typeof INTEGRATION_KEYS)[number];
export type EmailTransport = "SMTP" | "CONSOLE" | "OFF";

export interface IntegrationCredentialStatus {
  key: IntegrationKey;
  isSet: boolean;
  readable: boolean;
  hint: string | null;
  updatedAt: string | null;
}

export interface IntegrationStatus {
  mode: IntegrationMode;
  modeUpdatedAt: string | null;
  credentials: IntegrationCredentialStatus[];
  features: { email: EmailTransport };
}

export type IntegrationCredentialInput = { key: IntegrationKey; value: string };
