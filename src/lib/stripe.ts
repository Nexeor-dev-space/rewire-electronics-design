import "server-only";

import Stripe from "stripe";
import { INTEGRATION_TEST_TIMEOUT_MS } from "@/lib/constants";
import { parseStripeEnv, parseStripeWebhookEnv, stripeEnv } from "@/lib/env";

type Source = Record<string, string | undefined>;

export type StripeMode = "live" | "test";

export interface StripeDescription {
  configured: boolean;
  mode: StripeMode | null;
  webhookConfigured: boolean;
  problem: string | null;
}

export interface StripeKeyCheck {
  accepted: boolean;
  message: string;
}

const KEY_MODES: [RegExp, StripeMode][] = [
  [/^(sk|rk)_live_/, "live"],
  [/^(sk|rk)_test_/, "test"],
];

const MESSAGE_KEY_NOT_SET = "STRIPE_SECRET_KEY is not set.";
const MESSAGE_KEY_INVALID = "STRIPE_SECRET_KEY is set but invalid.";
const MESSAGE_WEBHOOK_INVALID = "STRIPE_WEBHOOK_SECRET is set but invalid.";
const MESSAGE_KEY_ACCEPTED = "Stripe accepted the key.";
const MESSAGE_KEY_REFUSED = "Stripe refused the key.";
const MESSAGE_UNREACHABLE = "Couldn't reach Stripe.";

/** Throws `Invalid environment` when STRIPE_SECRET_KEY is missing or wrong. See docs/PAYMENTS.md. */
export function stripeClient(): Stripe {
  return new Stripe(stripeEnv().STRIPE_SECRET_KEY);
}

const isBlank = (value: string | undefined) => !value?.trim();

function tryParse<T>(parse: (source: Source) => T, env: Source): T | null {
  try {
    return parse(env);
  } catch {
    return null;
  }
}

function keyMode(env: Source): StripeMode | null {
  const key = tryParse(parseStripeEnv, env)?.STRIPE_SECRET_KEY;
  if (!key) return null;
  return KEY_MODES.find(([pattern]) => pattern.test(key))?.[1] ?? null;
}

export function describeStripe(env: Source): StripeDescription {
  const mode = keyMode(env);
  const webhookConfigured = tryParse(parseStripeWebhookEnv, env) !== null;

  const problems: string[] = [];
  if (isBlank(env.STRIPE_SECRET_KEY)) problems.push(MESSAGE_KEY_NOT_SET);
  else if (!mode) problems.push(MESSAGE_KEY_INVALID);
  if (!isBlank(env.STRIPE_WEBHOOK_SECRET) && !webhookConfigured) problems.push(MESSAGE_WEBHOOK_INVALID);

  return {
    configured: mode !== null,
    mode,
    webhookConfigured,
    problem: problems.length > 0 ? problems.join(" ") : null,
  };
}

export async function checkStripeKey(): Promise<StripeKeyCheck> {
  try {
    await stripeClient().balance.retrieve({}, { timeout: INTEGRATION_TEST_TIMEOUT_MS });
    return { accepted: true, message: MESSAGE_KEY_ACCEPTED };
  } catch (error) {
    if (error instanceof Stripe.errors.StripePermissionError) return { accepted: true, message: MESSAGE_KEY_ACCEPTED };
    if (error instanceof Stripe.errors.StripeAuthenticationError) return { accepted: false, message: MESSAGE_KEY_REFUSED };
    console.error("checkStripeKey failed", error);
    return { accepted: false, message: MESSAGE_UNREACHABLE };
  }
}
