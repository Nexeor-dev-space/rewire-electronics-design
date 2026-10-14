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
