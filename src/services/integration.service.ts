import "server-only";

import { revalidateTag, unstable_cache } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";
import { appUrl } from "@/lib/app-url";
import { INTEGRATION_TEST_TIMEOUT_MS, INTEGRATIONS_CACHE_TAG } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email/send-email";
import { integrationTestEmail } from "@/lib/email/templates";
import { getIntegrationConfig, type IntegrationConfig } from "@/lib/integration-config";
import { ID_INTEGRATION_KEYS, INTEGRATIONS, integrationDefinition } from "@/lib/integrations";
import { checkStripeKey, describeStripe, type StripeMode } from "@/lib/stripe";
import type { SessionUser } from "@/types/auth";
import type {
  IdIntegrationKey,
  IntegrationKey,
  IntegrationStatus,
  IntegrationStatusDetail,
  IntegrationView,
  StorefrontIntegrations,
} from "@/types/integration";

interface TestOutcome {
  ok: boolean;
  message: string;
}

const MESSAGE_EMAIL_ENV_INVALID = "The email settings in the environment are invalid. Check the server log.";
const MESSAGE_EMAIL_CONSOLE = "SMTP_USER, SMTP_PASS and EMAIL_FROM are not set, so email is printed to the server log.";
const MESSAGE_EMAIL_OFF = "Production needs SMTP_USER, SMTP_PASS, EMAIL_FROM and APP_URL, so no email is sent.";
const MESSAGE_EMAIL_LOGGED = "Email is printed to the server log, not sent, because SMTP is not set up.";
const MESSAGE_EMAIL_FAILED = "The test email could not be sent.";
const MESSAGE_NOTHING_SAVED = "Nothing is saved yet.";
const MESSAGE_NO_SITE_ADDRESS = "The site address is unknown, so the homepage can't be checked. Check APP_URL.";
const MESSAGE_HOMEPAGE_UNREACHABLE = "Couldn't open the homepage.";
const MESSAGE_TAG_FOUND = "Found on the homepage.";
const MESSAGE_TAG_MISSING = "The homepage does not show this ID yet.";

const STRIPE_MODE_LABELS: Record<StripeMode, string> = { live: "Live", test: "Test" };

const integrationSelect = {
  key: true,
  value: true,
  changedAt: true,
  lastTestOk: true,
  lastTestMessage: true,
  lastTestedAt: true,
  changedBy: { select: { fullName: true } },
} satisfies Prisma.IntegrationSelect;

type IntegrationRow = Prisma.IntegrationGetPayload<{ select: typeof integrationSelect }>;

function emailStatus(): IntegrationStatus {
  let email: IntegrationConfig["email"];
  try {
    email = getIntegrationConfig().email;
  } catch {
    return { configured: false, details: [{ label: "Problem", value: MESSAGE_EMAIL_ENV_INVALID }] };
  }

  switch (email.transport) {
    case "SMTP":
      return {
        configured: true,
        details: [
          { label: "Host", value: email.smtp.host },
          { label: "Port", value: String(email.smtp.port) },
          { label: "Sender", value: email.smtp.from },
        ],
      };
    case "CONSOLE":
      return { configured: false, details: [{ label: "Missing", value: MESSAGE_EMAIL_CONSOLE }] };
    case "OFF":
      return { configured: false, details: [{ label: "Missing", value: MESSAGE_EMAIL_OFF }] };
  }
}

function stripeStatus(): IntegrationStatus {
  const stripe = describeStripe(process.env);
  const details: IntegrationStatusDetail[] = [];
  if (stripe.problem) details.push({ label: "Problem", value: stripe.problem });
  if (stripe.mode) details.push({ label: "Mode", value: STRIPE_MODE_LABELS[stripe.mode] });
  details.push({ label: "Webhook", value: stripe.webhookConfigured ? "Set" : "Not set" });
  return { configured: stripe.configured, details };
}

function statusFor(key: IntegrationKey): IntegrationStatus | null {
  if (key === "EMAIL") return emailStatus();
  if (key === "STRIPE") return stripeStatus();
  return null;
}

function toView(key: IntegrationKey, row: IntegrationRow | undefined): IntegrationView {
  const lastTest =
    row?.lastTestedAt && row.lastTestOk !== null
      ? { ok: row.lastTestOk, message: row.lastTestMessage, at: row.lastTestedAt.toISOString() }
      : null;
  return {
    key,
    value: integrationDefinition(key).kind === "ID" ? (row?.value ?? "") : "",
    status: statusFor(key),
    lastTest,
    changedBy: row?.changedBy?.fullName ?? null,
    changedAt: row?.changedAt?.toISOString() ?? null,
  };
}

export async function listIntegrations(): Promise<IntegrationView[]> {
  const rows = await prisma.integration.findMany({ select: integrationSelect });
  const byKey = new Map(rows.map((row) => [row.key, row]));
  return INTEGRATIONS.map(({ key }) => toView(key, byKey.get(key)));
}

export async function updateIntegrationValue(
  key: IdIntegrationKey,
  value: string,
  actorId: string,
): Promise<IntegrationView> {
  const data = { value, changedById: actorId, changedAt: new Date() };
  const row = await prisma.integration.upsert({
    where: { key },
    create: { key, ...data },
    update: data,
    select: integrationSelect,
  });
  revalidateTag(INTEGRATIONS_CACHE_TAG);
  return toView(key, row);
}

async function readHomepage(): Promise<{ ok: true; html: string } | { ok: false; message: string }> {
  let url: string;
  try {
    url = await appUrl("/");
  } catch {
    return { ok: false, message: MESSAGE_NO_SITE_ADDRESS };
  }

  try {
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(INTEGRATION_TEST_TIMEOUT_MS) });
    if (!response.ok) return { ok: false, message: `The homepage answered with status ${response.status}.` };
    return { ok: true, html: await response.text() };
  } catch (error) {
    console.error("runIntegrationTest homepage fetch failed", error);
    return { ok: false, message: MESSAGE_HOMEPAGE_UNREACHABLE };
  }
}

async function testHomepageTag(key: IdIntegrationKey): Promise<TestOutcome> {
  const row = await prisma.integration.findUnique({ where: { key }, select: { value: true } });
  const value = row?.value ?? "";
  if (!value) return { ok: false, message: MESSAGE_NOTHING_SAVED };

  const page = await readHomepage();
  if (!page.ok) return page;
  return page.html.includes(value)
    ? { ok: true, message: MESSAGE_TAG_FOUND }
    : { ok: false, message: MESSAGE_TAG_MISSING };
}

async function testEmail(user: SessionUser): Promise<TestOutcome> {
  try {
    const result = await sendEmail({ to: user.email, ...integrationTestEmail(user.fullName) });
    return result === "SENT"
      ? { ok: true, message: `Test email sent to ${user.email}.` }
      : { ok: false, message: MESSAGE_EMAIL_LOGGED };
  } catch (error) {
    console.error("runIntegrationTest email failed", error);
    return { ok: false, message: error instanceof Error && error.message ? error.message : MESSAGE_EMAIL_FAILED };
  }
}

async function testStripe(): Promise<TestOutcome> {
  const stripe = describeStripe(process.env);
  if (!stripe.configured) return { ok: false, message: stripe.problem ?? "" };

  const check = await checkStripeKey();
  if (!check.accepted) return { ok: false, message: check.message };

  const accepted = `Stripe accepted the ${stripe.mode} mode key`;
  return stripe.webhookConfigured
    ? { ok: true, message: `${accepted} and the webhook secret is set.` }
    : {
        ok: false,
        message: `${accepted}, but no valid webhook secret is set, so payments are only recorded when the customer comes back to the site.`,
      };
}

function testIntegration(key: IntegrationKey, user: SessionUser): Promise<TestOutcome> {
  switch (key) {
    case "EMAIL":
      return testEmail(user);
    case "STRIPE":
      return testStripe();
    default:
      return testHomepageTag(key);
  }
}

export async function runIntegrationTest(key: IntegrationKey, user: SessionUser): Promise<IntegrationView> {
  const outcome = await testIntegration(key, user);
  const data = { lastTestOk: outcome.ok, lastTestMessage: outcome.message, lastTestedAt: new Date() };
  const row = await prisma.integration.upsert({
    where: { key },
    create: { key, ...data },
    update: data,
    select: integrationSelect,
  });
  return toView(key, row);
}

async function readStorefrontIntegrations(): Promise<StorefrontIntegrations> {
  const rows = await prisma.integration.findMany({
    where: { key: { in: ID_INTEGRATION_KEYS } },
    select: { key: true, value: true },
  });
  const safeValue = (key: IdIntegrationKey) => {
    const value = rows.find((row) => row.key === key)?.value ?? "";
    return integrationDefinition(key).pattern.test(value) ? value : "";
  };
  return {
    ga4: safeValue("GA4"),
    clarity: safeValue("CLARITY"),
    searchConsole: safeValue("SEARCH_CONSOLE"),
    metaPixel: safeValue("META_PIXEL"),
  };
}

export const getStorefrontIntegrations = unstable_cache(readStorefrontIntegrations, ["integrations", "storefront"], {
  tags: [INTEGRATIONS_CACHE_TAG],
});
