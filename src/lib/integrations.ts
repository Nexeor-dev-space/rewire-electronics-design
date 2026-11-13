import type { EnvIntegrationKey, IdIntegrationKey, IntegrationKey } from "@/types/integration";

export type IntegrationKind = "ID" | "ENV";

interface IntegrationBase {
  label: string;
  purpose: string;
}

export interface IdIntegration extends IntegrationBase {
  key: IdIntegrationKey;
  kind: "ID";
  pattern: RegExp;
  hint: string;
  example: string;
  whereToGet: string;
  letterCase?: "upper" | "lower";
}

export interface EnvIntegration extends IntegrationBase {
  key: EnvIntegrationKey;
  kind: "ENV";
}

export type IntegrationDefinition = IdIntegration | EnvIntegration;

export const INTEGRATIONS: readonly IntegrationDefinition[] = [
  {
    key: "GA4",
    kind: "ID",
    label: "Google Analytics 4",
    purpose: "Measures visits, traffic sources and purchases on the storefront.",
    pattern: /^G-[A-Z0-9]{6,16}$/,
    hint: "G-XXXXXXXXXX",
    example: "G-AB12CD34EF",
    whereToGet: "In Google Analytics, open Admin, then Data streams, choose the website stream and copy its Measurement ID.",
    letterCase: "upper",
  },
  {
    key: "CLARITY",
    kind: "ID",
    label: "Microsoft Clarity",
    purpose: "Shows how shoppers move through the storefront with heatmaps and session recordings.",
    pattern: /^[a-z0-9]{6,20}$/,
    hint: "abcd1234ef",
    example: "k3x9p2m7qa",
    whereToGet: "In Microsoft Clarity, open the project, then Settings, then Overview, and copy the Project ID.",
    letterCase: "lower",
  },
  {
    key: "SEARCH_CONSOLE",
    kind: "ID",
    label: "Google Search Console",
    purpose: "Proves to Google that the store owns the site, so search performance and indexing can be checked.",
    pattern: /^[A-Za-z0-9_-]{20,100}$/,
    hint: "20 to 100 letters, digits, dashes or underscores",
    example: "Xc8nP2qL7vR4tY9wK1mB6sD3fG0hJ5aZ_eU-iO2xN7c",
    whereToGet:
      "In Google Search Console, add the site as a URL prefix property, choose the HTML tag method and copy only the value inside content.",
  },
  {
    key: "META_PIXEL",
    kind: "ID",
    label: "Meta Pixel",
    purpose: "Reports storefront visits and purchases to Meta to measure ads.",
    pattern: /^\d{15,16}$/,
    hint: "123456789012345",
    example: "804215376190482",
    whereToGet: "In Meta Events Manager, open Data sources, choose the pixel and copy the ID shown under its name.",
  },
  {
    key: "EMAIL",
    kind: "ENV",
    label: "Email (Resend over SMTP)",
    purpose: "Sends the account, order and waitlist emails.",
  },
  {
    key: "STRIPE",
    kind: "ENV",
    label: "Stripe",
    purpose: "Takes card and Apple Pay payments at checkout.",
  },
];

export const INTEGRATION_KEYS = INTEGRATIONS.map((definition) => definition.key) as [IntegrationKey, ...IntegrationKey[]];

export const ID_INTEGRATIONS = INTEGRATIONS.filter((definition): definition is IdIntegration => definition.kind === "ID");

export const ID_INTEGRATION_KEYS = ID_INTEGRATIONS.map((definition) => definition.key) as [
  IdIntegrationKey,
  ...IdIntegrationKey[],
];

export function integrationDefinition(key: IdIntegrationKey): IdIntegration;
export function integrationDefinition(key: IntegrationKey): IntegrationDefinition;
export function integrationDefinition(key: IntegrationKey): IntegrationDefinition {
  const definition = INTEGRATIONS.find((entry) => entry.key === key);
  if (!definition) throw new Error(`Unknown integration ${key}`);
  return definition;
}

export function normaliseIntegrationValue(key: IdIntegrationKey, raw: string): string {
  const value = raw.trim();
  switch (integrationDefinition(key).letterCase) {
    case "upper":
      return value.toUpperCase();
    case "lower":
      return value.toLowerCase();
    default:
      return value;
  }
}
