import "server-only";

import Stripe from "stripe";
import { stripeEnv } from "@/lib/env";

/** Throws `Invalid environment` when STRIPE_SECRET_KEY is missing or wrong. See docs/PAYMENTS.md. */
export function stripeClient(): Stripe {
  return new Stripe(stripeEnv().STRIPE_SECRET_KEY);
}
