import { z } from "zod";
import { AUTH_SECRET_MIN_LENGTH, SMTP_DEFAULT_HOST, SMTP_DEFAULT_PORT } from "./constants";

type Source = Record<string, string | undefined>;

const SMTP_LOGIN_KEYS = ["SMTP_USER", "SMTP_PASS", "EMAIL_FROM"] as const;

const blankToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalText = z.preprocess(blankToUndefined, z.string().optional());

const NAMED_ADDRESS = /^[^<>]+<([^<>]+)>$/;

const isSenderAddress = (value: string) => {
  const address = value.trim().match(NAMED_ADDRESS)?.[1] ?? value.trim();
  return z.email().safeParse(address).success;
};

const senderText = z.preprocess(
  blankToUndefined,
  z
    .string()
    .refine(isSenderAddress, "EMAIL_FROM must be an address or Name <address>, e.g. Rewire <no-reply@rewire.ae>.")
    .optional(),
);

const databaseSchema = z.object({
  DATABASE_URL: z.preprocess(blankToUndefined, z.string({ error: "DATABASE_URL must be set." }).trim()),
});

const authSchema = z.object({
  AUTH_SECRET: z.preprocess(
    blankToUndefined,
    z
      .string({ error: "AUTH_SECRET must be set." })
      .min(AUTH_SECRET_MIN_LENGTH, `AUTH_SECRET must be at least ${AUTH_SECRET_MIN_LENGTH} characters.`),
  ),
});

/** A secret (`sk_`) or restricted (`rk_`) key; a publishable `pk_` key is a common paste mistake. */
const STRIPE_SECRET_KEY_PATTERN = /^(sk|rk)_/;

const stripeSchema = z.object({
  STRIPE_SECRET_KEY: z.preprocess(
    blankToUndefined,
    z
      .string({ error: "STRIPE_SECRET_KEY must be set." })
      .trim()
      .regex(STRIPE_SECRET_KEY_PATTERN, "STRIPE_SECRET_KEY must be a secret key (sk_…), not the publishable key."),
  ),
});

/** The endpoint's signing secret from the Stripe dashboard (Webhooks, Reveal). */
const STRIPE_WEBHOOK_SECRET_PATTERN = /^whsec_/;

const stripeWebhookSchema = z.object({
  STRIPE_WEBHOOK_SECRET: z.preprocess(
    blankToUndefined,
    z
      .string({ error: "STRIPE_WEBHOOK_SECRET must be set." })
      .trim()
      .regex(STRIPE_WEBHOOK_SECRET_PATTERN, "STRIPE_WEBHOOK_SECRET must be the endpoint's signing secret (whsec_…)."),
  ),
});

/** A bare host such as `minio.example.com`. MinIO is always reached over HTTPS on the default port. */
const HOST_ONLY = /^[a-z0-9.-]+$/i;

const requiredMinio = (key: string) =>
  z.preprocess(blankToUndefined, z.string({ error: `${key} must be set.` }).trim());

/** Where the bucket's objects can be fetched anonymously. */
const mediaPublicUrl = (endpoint: string, bucket: string) => `https://${endpoint}/${bucket}`;

const storageSchema = z.object({
  MINIO_ENDPOINT: requiredMinio("MINIO_ENDPOINT").pipe(
    z.string().regex(HOST_ONLY, "MINIO_ENDPOINT must be a host only, e.g. minio.example.com (no https://, no path)."),
  ),
  MINIO_ACCESS_KEY: requiredMinio("MINIO_ACCESS_KEY"),
  MINIO_SECRET_KEY: requiredMinio("MINIO_SECRET_KEY"),
  MINIO_BUCKET: requiredMinio("MINIO_BUCKET"),
});

const emailSchema = z
  .object({
    SMTP_HOST: z.preprocess(blankToUndefined, z.string().trim().default(SMTP_DEFAULT_HOST)),
    SMTP_PORT: z.preprocess(blankToUndefined, z.coerce.number().int().positive().default(SMTP_DEFAULT_PORT)),
    SMTP_USER: optionalText,
    SMTP_PASS: optionalText,
    EMAIL_FROM: senderText,
    APP_URL: z.preprocess(blankToUndefined, z.url({ error: "APP_URL must be a full URL, e.g. https://rewire.ae." }).optional()),
  })
  .superRefine((env, ctx) => {
    const set = SMTP_LOGIN_KEYS.filter((key) => env[key] !== undefined);
    if (set.length === 0 || set.length === SMTP_LOGIN_KEYS.length) return;
    for (const key of SMTP_LOGIN_KEYS) {
      if (env[key] === undefined) {
        ctx.addIssue({ code: "custom", path: [key], message: `${key} must be set when ${set.join(", ")} is set.` });
      }
    }
  });

export type DatabaseEnv = z.output<typeof databaseSchema>;
export type AuthEnv = z.output<typeof authSchema>;
export type EmailEnv = z.output<typeof emailSchema>;
export type StripeEnv = z.output<typeof stripeSchema>;
export type StripeWebhookEnv = z.output<typeof stripeWebhookSchema>;
export type StorageEnv = z.output<typeof storageSchema>;

function parse<T extends z.ZodType>(schema: T, source: Source): z.output<T> {
  const result = schema.safeParse(source);
  if (!result.success) throw new Error(`Invalid environment:\n${z.prettifyError(result.error)}`);
  return result.data;
}

export function parseDatabaseEnv(source: Source): DatabaseEnv {
  return parse(databaseSchema, source);
}

export function parseAuthEnv(source: Source): AuthEnv {
  return parse(authSchema, source);
}

export function parseEmailEnv(source: Source): EmailEnv {
  return parse(emailSchema, source);
}

export function parseStripeEnv(source: Source): StripeEnv {
  return parse(stripeSchema, source);
}

export function parseStripeWebhookEnv(source: Source): StripeWebhookEnv {
  return parse(stripeWebhookSchema, source);
}

export function parseStorageEnv(source: Source): StorageEnv {
  return parse(storageSchema, source);
}

/**
 * The public media address (`https://<endpoint>/<bucket>`) without needing the
 * MinIO keys — for image links, and for `next.config.ts`, which runs at build
 * time and only has to allow the host. Undefined when endpoint or bucket is unset.
 */
export function optionalMediaPublicUrl(source: Source = process.env): string | undefined {
  const endpoint = source.MINIO_ENDPOINT?.trim();
  const bucket = source.MINIO_BUCKET?.trim();
  if (!endpoint || !bucket || !HOST_ONLY.test(endpoint)) return undefined;
  return mediaPublicUrl(endpoint, bucket);
}

export function optionalDatabaseUrl(source: Source = process.env): string | undefined {
  return source.DATABASE_URL?.trim() || undefined;
}

export function databaseEnv(): DatabaseEnv {
  return parseDatabaseEnv(process.env);
}

export function authEnv(): AuthEnv {
  return parseAuthEnv(process.env);
}

export function emailEnv(): EmailEnv {
  return parseEmailEnv(process.env);
}

export function stripeEnv(): StripeEnv {
  return parseStripeEnv(process.env);
}

/** Media storage. Read on first upload or download, so a missing key never stops the storefront booting. */
export function storageEnv(): StorageEnv {
  return parseStorageEnv(process.env);
}

/** Separate from `stripeEnv` so a missing webhook secret never stops card payments. */
export function stripeWebhookEnv(): StripeWebhookEnv {
  return parseStripeWebhookEnv(process.env);
}
