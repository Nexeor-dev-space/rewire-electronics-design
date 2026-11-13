import { z } from "zod";
import { INTEGRATION_VALUE_MAX_LENGTH } from "@/lib/constants";
import {
  ID_INTEGRATION_KEYS,
  INTEGRATION_KEYS,
  integrationDefinition,
  normaliseIntegrationValue,
} from "@/lib/integrations";
import type { IdIntegrationKey } from "@/types/integration";

export const integrationParamsSchema = z.object({ key: z.enum(INTEGRATION_KEYS) });

export const idIntegrationParamsSchema = z.object({ key: z.enum(ID_INTEGRATION_KEYS) });

function integrationValueSchema(key: IdIntegrationKey) {
  const { pattern, hint, example } = integrationDefinition(key);
  return z.object({
    value: z
      .string()
      .max(INTEGRATION_VALUE_MAX_LENGTH, `Keep it under ${INTEGRATION_VALUE_MAX_LENGTH} characters.`)
      .transform((raw) => normaliseIntegrationValue(key, raw))
      .refine((value) => value === "" || pattern.test(value), `Expected format: ${hint}, for example ${example}.`),
  });
}

export const integrationValueSchemas = {
  GA4: integrationValueSchema("GA4"),
  CLARITY: integrationValueSchema("CLARITY"),
  SEARCH_CONSOLE: integrationValueSchema("SEARCH_CONSOLE"),
  META_PIXEL: integrationValueSchema("META_PIXEL"),
} satisfies Record<IdIntegrationKey, z.ZodType>;
