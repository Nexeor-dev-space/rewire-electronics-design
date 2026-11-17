import type { z } from "zod";
import type { integrationValueSchemas } from "@/validators/integration.validator";

export type IdIntegrationKey = "GA4" | "CLARITY" | "SEARCH_CONSOLE" | "META_PIXEL";
export type EnvIntegrationKey = "EMAIL" | "STRIPE";
export type IntegrationKey = IdIntegrationKey | EnvIntegrationKey;

export interface IntegrationStatusDetail {
  label: string;
  value: string;
}

export interface IntegrationStatus {
  configured: boolean;
  details: IntegrationStatusDetail[];
}

export interface IntegrationTestResult {
  ok: boolean;
  message: string;
  at: string;
}

export interface IntegrationView {
  key: IntegrationKey;
  value: string;
  status: IntegrationStatus | null;
  lastTest: IntegrationTestResult | null;
  changedBy: string | null;
  changedAt: string | null;
}

export interface StorefrontIntegrations {
  ga4: string;
  clarity: string;
  searchConsole: string;
  metaPixel: string;
}

export type IntegrationValueInput = z.input<(typeof integrationValueSchemas)[IdIntegrationKey]>;
