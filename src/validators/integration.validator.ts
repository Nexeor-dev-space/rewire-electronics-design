import { z } from "zod";
import { INTEGRATION_VALUE_MAX_LENGTH } from "@/lib/constants";
import { INTEGRATION_KEYS, INTEGRATION_MODES } from "@/lib/integration-keys";
import type { IntegrationKey } from "@/types/integration";
import { emailValidator } from "./common/primitives.validator";

const HOSTNAME_MAX_LENGTH = 253;
const SMTP_USER_MAX_LENGTH = 254;
const SENDER_MAX_LENGTH = 320;
const APP_URL_MAX_LENGTH = 200;
const PORT_MIN = 1;
const PORT_MAX = 65535;
const DEL_CHAR_CODE = 0x7f;
const FIRST_PRINTABLE_CHAR_CODE = 0x20;

const HOSTNAME_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)*$/;
const PORT_PATTERN = /^\d{1,5}$/;
const NO_WHITESPACE_PATTERN = /^\S+$/;
const SENDER_PATTERN = /^([^<>"]*?)\s*<([^<>]+)>$/;
const LOCAL_HOSTS = ["localhost", "127.0.0.1"];

const MESSAGE_NO_WHITESPACE = "Remove any spaces.";

function hasControlChars(value: string): boolean {
  for (const char of value) {
    const code = char.charCodeAt(0);
    if (code < FIRST_PRINTABLE_CHAR_CODE || code === DEL_CHAR_CODE) return true;
  }
  return false;
}

function textValue(maxLength: number) {
  return z
    .string()
    .transform((value) => value.trim())
    .pipe(
      z
        .string()
        .min(1, "Enter a value.")
        .max(maxLength, `Use ${maxLength} characters or fewer.`)
        .refine((value) => !hasControlChars(value), "Remove line breaks and control characters."),
    );
}

function parseSender(value: string): string | null {
  const match = SENDER_PATTERN.exec(value);
  const name = match ? match[1].trim() : "";
  const address = emailValidator.safeParse(match ? match[2] : value);
  if (!address.success) return null;
  return name ? `${name} <${address.data}>` : address.data;
}

function parseAppUrl(value: string): string | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  const secure = url.protocol === "https:";
  const local = url.protocol === "http:" && LOCAL_HOSTS.includes(url.hostname);
  if (!secure && !local) return null;
  if (url.username || url.password || url.search || url.hash) return null;
  if (url.pathname !== "/") return null;
  return url.origin;
}

function isPort(value: string): boolean {
  if (!PORT_PATTERN.test(value)) return false;
  const port = Number(value);
  return port >= PORT_MIN && port <= PORT_MAX;
}

export const integrationValueSchemas: Record<IntegrationKey, z.ZodType<string, string>> = {
  SMTP_HOST: textValue(HOSTNAME_MAX_LENGTH).refine(
    (value) => HOSTNAME_PATTERN.test(value),
    "Enter a host like smtp.gmail.com, without http:// or a port.",
  ),
  SMTP_PORT: textValue(INTEGRATION_VALUE_MAX_LENGTH)
    .refine(isPort, `Enter a port between ${PORT_MIN} and ${PORT_MAX}.`)
    .transform((value) => String(Number(value))),
  SMTP_USER: textValue(SMTP_USER_MAX_LENGTH).refine(
    (value) => NO_WHITESPACE_PATTERN.test(value),
    MESSAGE_NO_WHITESPACE,
  ),
  SMTP_PASS: textValue(INTEGRATION_VALUE_MAX_LENGTH).transform((value) => value.replace(/ /g, "")),
  EMAIL_FROM: textValue(SENDER_MAX_LENGTH)
    .refine((value) => parseSender(value) !== null, "Use name@domain or Name <name@domain>.")
    .transform((value) => parseSender(value) ?? value),
  APP_URL: textValue(APP_URL_MAX_LENGTH)
    .refine(
      (value) => parseAppUrl(value) !== null,
      "Enter the site address, like https://rewire-electronics.com.",
    )
    .transform((value) => parseAppUrl(value) ?? value),
};

export const integrationModeSchema = z.object({ mode: z.enum(INTEGRATION_MODES) });

export const integrationKeyParamSchema = z.enum(INTEGRATION_KEYS);

export function integrationCredentialSchema(key: IntegrationKey) {
  return z.object({ value: integrationValueSchemas[key] });
}
